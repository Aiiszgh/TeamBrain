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
} from 'lucide-react';

export const ChatPage: React.FC = () => {
  const { currentTeam } = useAuth();
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<IConversation | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [inputContent, setInputContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [extractedNotice, setExtractedNotice] = useState<IMemory[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        body: JSON.stringify({ content }),
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
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden">
      {/* Sidebar: Conversations List */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Conversations</span>
          <button
            onClick={handleCreateConversation}
            className="flex items-center space-x-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="p-4 text-xs text-slate-400 text-center">
              No conversations yet. Start one!
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedConv(c)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center space-x-2 transition ${
                  selectedConv?.id === c.id
                    ? 'bg-indigo-50 text-indigo-900 font-semibold shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate">{c.title || 'Untitled Conversation'}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col h-full bg-slate-50">
        {selectedConv ? (
          <>
            {/* Header info */}
            <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">{selectedConv.title || 'New Conversation'}</h2>
                <p className="text-xs text-slate-500">
                  Private persistent assistant context in team <b>{currentTeam.name}</b>
                </p>
              </div>
            </div>

            {/* Notification of extracted durable memories */}
            {extractedNotice.length > 0 && (
              <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-sm text-emerald-900">
                <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-emerald-800">
                    Durable Knowledge Automatically Extracted & Stored!
                  </div>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    The assistant detected durable personal knowledge and generated vector embeddings for future retrieval:
                  </p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {extractedNotice.map((m) => (
                      <li key={m.id} className="bg-white/80 p-1.5 rounded border border-emerald-200">
                        • <b>{m.kind}</b>: {m.content}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                {errorMessage}
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                  <Bot className="h-12 w-12 text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-600">Start the conversation</p>
                  <p className="text-xs max-w-sm mt-1">
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
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-xl rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        m.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>

                      {/* Source Citation Badges */}
                      {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          <span className="font-semibold text-slate-400">Sources Cited:</span>
                          {m.sources.map((srcId) => (
                            <span
                              key={srcId}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 text-slate-700 font-mono rounded text-[11px]"
                            >
                              <BookmarkCheck className="h-3 w-3 text-indigo-500" />
                              <span>{srcId.slice(-6)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {m.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0">
                        <UserIcon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-white border-t border-slate-200">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  placeholder="Ask TeamBrain, share project context, or record instructions..."
                  disabled={isSending}
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isSending || !inputContent.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Select a conversation on the left or create a new one to begin.
          </div>
        )}
      </main>
    </div>
  );
};
