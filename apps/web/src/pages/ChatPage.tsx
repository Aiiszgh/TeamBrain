import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { IConversation, IMessage, IMemory } from '@teambrain/shared';
import {
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  BookmarkCheck,
  Layers,
  Brain,
  Trash2,
  X,
  ExternalLink,
  Target,
  Loader2,
  Info,
  ShieldCheck,
} from 'lucide-react';

interface ChatPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ onNavigateTab }) => {
  const { currentTeam } = useAuth();
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<IConversation | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [inputContent, setInputContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [extractedNotice, setExtractedNotice] = useState<IMemory[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [memoryContextEnabled, setMemoryContextEnabled] = useState(true);
  const [inspectingSourceId, setInspectingSourceId] = useState<string | null>(null);
  const [inspectedMemory, setInspectedMemory] = useState<(IMemory & { ownerName?: string; ownerEmail?: string }) | null>(null);
  const [isLoadingInspection, setIsLoadingInspection] = useState(false);
  const [inspectionError, setInspectionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleInspectCitation = async (srcId: string) => {
    setInspectingSourceId(srcId);
    setInspectedMemory(null);
    setIsLoadingInspection(true);
    setInspectionError(null);
    try {
      const data = await apiRequest<IMemory & { ownerName?: string; ownerEmail?: string }>(`/memories/${srcId}`);
      setInspectedMemory(data);
    } catch (err: any) {
      setInspectionError(err.message || 'Unable to retrieve stored memory document from database.');
    } finally {
      setIsLoadingInspection(false);
    }
  };

  const closeInspectionModal = () => {
    setInspectingSourceId(null);
    setInspectedMemory(null);
    setInspectionError(null);
  };

  const loadConversations = async () => {
    if (!currentTeam) return;
    try {
      const list = await apiRequest<IConversation[]>(`/conversations?teamId=${currentTeam.id}`);
      setConversations(list);
      if (list.length > 0 && !selectedConv) {
        setSelectedConv(list[0] ?? null);
      }
    } catch (err: any) {
      console.warn('Failed to fetch conversations:', err);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const msgs = await apiRequest<IMessage[]>(`/conversations/${convId}/messages`);
      setMessages(msgs);
    } catch (err: any) {
      console.warn('Failed to fetch messages:', err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [currentTeam]);

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.id);
      setExtractedNotice([]);
    }
  }, [selectedConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateConversation = async () => {
    if (!currentTeam) return;
    try {
      const newConv = await apiRequest<IConversation>('/conversations', {
        method: 'POST',
        body: JSON.stringify({
          teamId: currentTeam.id,
          title: 'New Conversation',
        }),
      });
      setConversations([newConv, ...conversations]);
      setSelectedConv(newConv);
      setMessages([]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create conversation');
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation and its history?')) return;
    try {
      await apiRequest(`/conversations/${convId}`, { method: 'DELETE' });
      const updated = conversations.filter((c) => c.id !== convId);
      setConversations(updated);
      if (selectedConv?.id === convId) {
        setSelectedConv(updated[0] ?? null);
        setMessages([]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete conversation');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim() || !selectedConv || isSending) return;

    const content = inputContent.trim();
    setInputContent('');
    setIsSending(true);
    setErrorMessage('');
    setExtractedNotice([]);

    // Optimistic user turn
    const tempUserMsg: IMessage = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConv.id,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const result = await apiRequest<{
        userMessage: IMessage;
        assistantMessage: IMessage;
        extractedMemories: IMemory[];
      }>(`/conversations/${selectedConv.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, memoryEnabled: memoryContextEnabled }),
      });

      // Replace optimistic turn and append assistant turn
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        result.userMessage,
        result.assistantMessage,
      ]);

      if (result.extractedMemories && result.extractedMemories.length > 0) {
        setExtractedNotice(result.extractedMemories);
      }

      // Refresh conversations list to update title if it changed
      loadConversations();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send message to assistant');
      // Remove optimistic turn on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsSending(false);
    }
  };

  if (!currentTeam) {
    return (
      <div className="p-8 text-center text-slate-500">
        Please select or join a team from the header to start a conversation.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#0B0F19] overflow-hidden text-slate-200">
      {/* Sidebar: Conversations List */}
      <aside className="w-72 bg-slate-950 border-r border-slate-800/80 flex flex-col">
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Conversations</span>
          <button
            onClick={handleCreateConversation}
            className="flex items-center space-x-1 px-2.5 py-1 bg-indigo-950/80 text-indigo-300 hover:bg-indigo-900 border border-indigo-700/50 rounded-lg text-xs font-semibold transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="p-4 text-xs text-slate-500 text-center">
              No conversations yet. Start one!
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedConv(c)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between group cursor-pointer transition ${
                  selectedConv?.id === c.id
                    ? 'bg-indigo-950/80 border border-indigo-700/60 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                  <span className="truncate">{c.title || 'Untitled Conversation'}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDeleteConversation(c.id, e)}
                  title="Delete conversation"
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 rounded transition"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col h-full bg-[#0B0F19]">
        {selectedConv ? (
          <>
            {/* Header info */}
            <div className="px-6 py-3 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">{selectedConv.title || 'New Conversation'}</h2>
                <p className="text-xs text-slate-400">
                  Private persistent assistant context in team <b className="text-indigo-300">{currentTeam.name}</b>
                </p>
              </div>

              {/* Memory Context Comparison Toggle */}
              <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2">
                  Context:
                </span>
                <button
                  type="button"
                  onClick={() => setMemoryContextEnabled(true)}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    memoryContextEnabled
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Include verified team and personal memories in assistant context"
                >
                  <Brain className="h-3.5 w-3.5" />
                  <span>Memory ON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMemoryContextEnabled(false)}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    !memoryContextEnabled
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Answer without any team or personal memories (General Baseline mode)"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Memory OFF (Baseline)</span>
                </button>
              </div>
            </div>

            {/* Notification of extracted durable memories */}
            {extractedNotice.length > 0 && (
              <div className="mx-6 mt-4 p-3.5 bg-emerald-950/40 border border-emerald-700/50 rounded-xl flex items-start space-x-3 text-sm text-emerald-200">
                <Sparkles className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-emerald-300">
                    Durable Knowledge Automatically Extracted & Stored!
                  </div>
                  <p className="text-xs text-emerald-400/90 mt-0.5">
                    The assistant detected durable personal knowledge and generated vector embeddings for future retrieval:
                  </p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {extractedNotice.map((m) => (
                      <li key={m.id} className="bg-slate-950/70 p-1.5 rounded border border-emerald-800/60">
                        • <b>{m.kind}</b>: {m.content}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mx-6 mt-4 p-3 bg-red-950/50 border border-red-800 text-red-200 text-sm rounded-xl">
                {errorMessage}
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                  <Bot className="h-12 w-12 text-slate-700 mb-2" />
                  <p className="text-sm font-medium text-slate-300">Start the conversation</p>
                  <p className="text-xs max-w-sm mt-1 text-slate-500">
                    Ask questions, document decisions, or discuss project tasks. Durable facts are automatically remembered in your personal knowledge vault.
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-start space-x-3 ${
                      m.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {m.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-xl rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        m.role === 'user'
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white'
                          : 'bg-slate-900/90 border border-slate-800 text-slate-200'
                      }`}
                    >
                      {/* Memory Context Mode Badge for Assistant */}
                      {m.role === 'assistant' && (
                        <div className="flex items-center space-x-2 mb-2">
                          {m.memoryEnabled === false ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-950/60 text-amber-300 text-[10px] font-semibold rounded-full border border-amber-800/60">
                              <Sparkles className="h-2.5 w-2.5" />
                              <span>Baseline Mode (Memory OFF)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-indigo-950/60 text-indigo-300 text-[10px] font-semibold rounded-full border border-indigo-700/60">
                              <Brain className="h-2.5 w-2.5" />
                              <span>Memory Infused (Context Active)</span>
                            </span>
                          )}
                        </div>
                      )}

                      <div className="whitespace-pre-wrap">{m.content}</div>

                      {/* Source Citation Badges */}
                      {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="font-semibold text-slate-400 flex items-center space-x-1 mr-0.5">
                            <BookmarkCheck className="h-3.5 w-3.5 text-indigo-400" />
                            <span>Sources Cited:</span>
                          </span>
                          {m.sources.map((srcId) => (
                            <button
                              key={srcId}
                              type="button"
                              onClick={() => handleInspectCitation(srcId)}
                              className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-950 hover:bg-indigo-950/80 text-indigo-300 hover:text-indigo-200 border border-slate-800 hover:border-indigo-600 rounded-lg text-xs font-mono font-medium transition group shadow-sm active:scale-95 cursor-pointer"
                              title="Inspect why this memory was recalled and selected"
                            >
                              <Sparkles className="h-3 w-3 text-indigo-400 group-hover:scale-110 transition-transform" />
                              <span>#{srcId.slice(-6)}</span>
                              <span className="text-[10px] text-slate-400 font-sans font-normal ml-0.5 group-hover:text-indigo-300">
                                (Inspect)
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {m.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center shrink-0 font-bold text-xs">
                        <UserIcon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-slate-950 border-t border-slate-800">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  placeholder="Ask TeamBrain, share project context, or record instructions..."
                  disabled={isSending}
                  className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isSending || !inputContent.trim()}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl text-sm font-semibold flex items-center space-x-1.5 transition disabled:opacity-50 shadow-md shadow-indigo-500/20"
                >
                  <Send className="h-4 w-4" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Select a conversation on the left or create a new one to begin.
          </div>
        )}
      </main>

      {/* Interactive Citation Inspection Modal */}
      {inspectingSourceId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={closeInspectionModal}
        >
          <div
            className="bg-slate-950 border border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Memory Citation Inspector</span>
                    <span className="font-mono text-xs text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                      #{inspectingSourceId.slice(-6)}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Inspecting stored memory document & selection rationale
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeInspectionModal}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                title="Close inspector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {isLoadingInspection ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
                  <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                  <span className="text-xs font-medium">Retrieving memory document from MongoDB...</span>
                </div>
              ) : inspectionError ? (
                <div className="p-4 bg-red-950/40 border border-red-800 text-red-200 rounded-xl text-xs space-y-2">
                  <div className="font-semibold flex items-center space-x-1.5">
                    <Info className="h-4 w-4 text-red-400 shrink-0" />
                    <span>Inspection Notice</span>
                  </div>
                  <p>{inspectionError}</p>
                  <p className="text-slate-400 font-mono text-[11px]">Source ID: {inspectingSourceId}</p>
                </div>
              ) : inspectedMemory ? (
                <>
                  {/* Taxonomy / Classification Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60 uppercase tracking-wide">
                      {inspectedMemory.kind || 'Memory'}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900 text-slate-300 border border-slate-700 capitalize">
                      Scope: {inspectedMemory.scope}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        inspectedMemory.status === 'shared'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800/70'
                          : inspectedMemory.status === 'personal'
                          ? 'bg-violet-950 text-violet-300 border-violet-800/70'
                          : 'bg-amber-950 text-amber-300 border-amber-800/70'
                      }`}
                    >
                      <span className="flex items-center space-x-1">
                        <ShieldCheck className="h-3 w-3 inline mr-1" />
                        {inspectedMemory.status === 'shared' ? 'Verified by Team' : inspectedMemory.status}
                      </span>
                    </span>
                    {inspectedMemory.importance && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900 text-slate-300 border border-slate-800">
                        Priority: {inspectedMemory.importance}/5
                      </span>
                    )}
                  </div>

                  {/* Exact Stored Content */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                      <BookmarkCheck className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Stored Memory Document</span>
                    </label>
                    <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans selection:bg-indigo-600">
                      {inspectedMemory.content}
                    </div>
                  </div>

                  {/* Why This Was Selected Section */}
                  <div className="p-4 bg-indigo-950/30 border border-indigo-800/50 rounded-xl space-y-2.5 text-xs">
                    <div className="flex items-center space-x-1.5 font-bold text-indigo-300">
                      <Target className="h-4 w-4 text-indigo-400" />
                      <span>Why Was This Memory Selected?</span>
                    </div>
                    <ul className="space-y-2 text-slate-300">
                      <li className="flex items-start space-x-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                        <span>
                          <b className="text-white">Semantic Recall:</b> High cosine similarity score in MongoDB Atlas Vector Search against the conversational topic and user query keywords.
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                        <span>
                          <b className="text-white">Workspace Consensus:</b> Verified active memory within <b className="text-indigo-200">{currentTeam?.name}</b> team workspace with unexpired TTL status.
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                        <span>
                          <b className="text-white">Behavioral Enforcement:</b> Injected into the AI system prompt to guide and restrict the assistant's advice to respect team consensus.
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Owner / Contributor</span>
                      <span className="text-slate-200 font-medium">
                        {inspectedMemory.ownerName || 'Verified Team Member'}
                      </span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Expiry / Lifecycle</span>
                      <span className="text-slate-200 font-medium">
                        {inspectedMemory.expiresAt
                          ? new Date(inspectedMemory.expiresAt).toLocaleDateString()
                          : 'Permanent (No Expiry)'}
                      </span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 col-span-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">MongoDB Document ID</span>
                      <span className="font-mono text-slate-300 text-[11px] select-all">
                        {inspectedMemory.id}
                      </span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
              {onNavigateTab ? (
                <button
                  type="button"
                  onClick={() => {
                    closeInspectionModal();
                    onNavigateTab('memories');
                  }}
                  className="flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  <span>Open Knowledge Vault</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={closeInspectionModal}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
