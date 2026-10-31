import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { getSocket } from '../socket/socketClient';
import { IMemory, IMemoryEvent, MemoryScope, MemoryKind } from '@teambrain/shared';
import {
  Sparkles,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Share2,
  FileText,
  History,
  GitBranch,
  Trash2,
  AlertCircle,
  Copy,
  Pencil,
} from 'lucide-react';

export const MemoriesPage: React.FC = () => {
  const { user, currentTeam, currentRole } = useAuth();
  const isDemoUser = Boolean(user?.email?.endsWith('@teambrain.io'));
  const [scopeTab, setScopeTab] = useState<'team' | 'personal' | 'search'>('team');
  const [memories, setMemories] = useState<IMemory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modals & form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [content, setContent] = useState('');
  const [kind, setKind] = useState<MemoryKind>('general');
  const [createScope, setCreateScope] = useState<MemoryScope>('personal');
  const [importance, setImportance] = useState(3);
  const [expiresInDays, setExpiresInDays] = useState('');

  // Edit modal
  const [editingMemory, setEditingMemory] = useState<IMemory | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editImportance, setEditImportance] = useState(3);

  // Reject modal
  const [rejectMemoryId, setRejectMemoryId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Correction modal
  const [correctionMemoryId, setCorrectionMemoryId] = useState<string | null>(null);
  const [correctionContent, setCorrectionContent] = useState('');

  // Audit Events modal
  const [auditMemory, setAuditMemory] = useState<IMemory | null>(null);
  const [auditEvents, setAuditEvents] = useState<IMemoryEvent[]>([]);

  // Vector Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<IMemory[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchScope, setSearchScope] = useState<MemoryScope>('team');

  const isModerator = currentRole === 'owner' || currentRole === 'admin';

  const loadMemories = async () => {
    if (!currentTeam) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      if (scopeTab === 'personal') {
        const list = await apiRequest<IMemory[]>('/memories?scope=personal');
        setMemories(list);
      } else if (scopeTab === 'team') {
        const list = await apiRequest<IMemory[]>(`/memories?scope=team&teamId=${currentTeam.id}`);
        setMemories(list);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch memories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scopeTab !== 'search') {
      loadMemories();
    }
  }, [scopeTab, currentTeam]);

  // Socket.IO live notifications
  useEffect(() => {
    const socket = getSocket();

    const handleMemoryPending = () => {
      if (scopeTab === 'team') {
        loadMemories();
      }
    };

    const handleMemoryShared = () => {
      if (scopeTab === 'team') {
        loadMemories();
      }
    };

    socket.on('memory:pending', handleMemoryPending);
    socket.on('memory:shared', handleMemoryShared);

    return () => {
      socket.off('memory:pending', handleMemoryPending);
      socket.off('memory:shared', handleMemoryShared);
    };
  }, [scopeTab, currentTeam]);

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoUser) {
      setErrorMessage('Action disabled in Demo Mode: Demo accounts operate with read-only permissions.');
      return;
    }
    if (!currentTeam || !content.trim()) return;

    try {
      await apiRequest('/memories', {
        method: 'POST',
        body: JSON.stringify({
          teamId: currentTeam.id,
          content: content.trim(),
          kind,
          scope: createScope,
          importance: Number(importance),
          expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
        }),
      });

      setShowCreateModal(false);
      setContent('');
      loadMemories();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create memory');
    }
  };

  const handleStartEdit = (mem: IMemory) => {
    if (isDemoUser) {
      setErrorMessage('Action disabled in Demo Mode: Demo accounts operate with read-only permissions.');
      return;
    }
    setEditingMemory(mem);
    setEditContent(mem.content);
    setEditImportance(mem.importance || 3);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoUser) {
      setErrorMessage('Action disabled in Demo Mode: Demo accounts operate with read-only permissions.');
      return;
    }
    if (!editingMemory || !editContent.trim()) return;
    try {
      await apiRequest(`/memories/${editingMemory.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          content: editContent.trim(),
          importance: editImportance,
        }),
      });
      setEditingMemory(null);
      loadMemories();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update memory');
    }
  };

  const handleShareToTeam = async (memoryId: string) => {
    if (isDemoUser) {
      setErrorMessage('Action disabled in Demo Mode: Demo accounts operate with read-only permissions.');
      return;
    }
    try {
      await apiRequest(`/memories/${memoryId}/share`, {
        method: 'POST',
        body: JSON.stringify({ targetScope: 'team' }),
      });
      loadMemories();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit memory to review');
    }
  };

  const handleApprove = async (memoryId: string) => {
    if (isDemoUser) {
      setErrorMessage('Action disabled in Demo Mode: Demo accounts operate with read-only permissions.');
      return;
    }
    try {
      await apiRequest(`/memories/${memoryId}/approve`, { method: 'POST' });
      loadMemories();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to approve memory');
    }
  };

  const handleReject = async () => {
    if (isDemoUser) {
      setErrorMessage('Action disabled in Demo Mode: Demo accounts operate with read-only permissions.');
      return;
    }
    if (!rejectMemoryId) return;
    try {
      await apiRequest(`/memories/${rejectMemoryId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      setRejectMemoryId(null);
      setRejectReason('');
      loadMemories();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reject memory');
    }
  };

  const handleCorrect = async () => {
    if (isDemoUser) {
      setErrorMessage('Action disabled in Demo Mode: Demo accounts operate with read-only permissions.');
      return;
    }
    if (!correctionMemoryId || !correctionContent.trim()) return;
    try {
      await apiRequest(`/memories/${correctionMemoryId}/correct`, {
        method: 'POST',
        body: JSON.stringify({ content: correctionContent.trim() }),
      });
      setCorrectionMemoryId(null);
      setCorrectionContent('');
      loadMemories();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit correction');
    }
  };

  const handleDelete = async (memoryId: string) => {
    if (isDemoUser) {
      setErrorMessage('Action disabled in Demo Mode: Demo accounts operate with read-only permissions.');
      return;
    }
    if (!confirm('Are you sure you want to delete this memory?')) return;
    try {
      await apiRequest(`/memories/${memoryId}`, { method: 'DELETE' });
      loadMemories();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete memory');
    }
  };

  const handleShowAudit = async (mem: IMemory) => {
    setAuditMemory(mem);
    try {
      const events = await apiRequest<IMemoryEvent[]>(`/memories/${mem.id}/events`);
      setAuditEvents(events);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load audit events');
    }
  };

  const handleVectorSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam || !searchQuery.trim()) return;
    setIsSearching(true);
    setErrorMessage('');
    try {
      const results = await apiRequest<IMemory[]>('/memories/search', {
        method: 'POST',
        body: JSON.stringify({
          teamId: currentTeam.id,
          scope: searchScope,
          query: searchQuery.trim(),
          limit: 10,
        }),
      });
      setSearchResults(results);
    } catch (err: any) {
      setErrorMessage(err.message || 'Atlas Vector Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  if (!currentTeam) {
    return <div className="p-8 text-center text-slate-400">Please select a team.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-200">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white">Knowledge & Memory Vault</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review contributions, manage supersessions, and explore team knowledge.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          disabled={isDemoUser}
          className={`inline-flex items-center space-x-2 px-4 py-2 font-medium text-xs sm:text-sm rounded-xl shadow-md transition ${
            isDemoUser
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-indigo-500/20'
          }`}
          title={isDemoUser ? 'Disabled in Demo Mode' : 'Create new memory'}
        >
          <Plus className="h-4 w-4" />
          <span>New Memory</span>
        </button>
      </div>

      {/* Demo notice banner */}
      {isDemoUser && (
        <div className="mt-6 p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span><b>Demo Mode Active:</b> You have full read access to inspect team knowledge, search memories, and view audit events. Mutations are disabled for guest accounts.</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-4 mt-6 border-b border-slate-800">
        <button
          onClick={() => setScopeTab('team')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition ${
            scopeTab === 'team'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Team Knowledge & Review Queue
        </button>

        <button
          onClick={() => setScopeTab('personal')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition ${
            scopeTab === 'personal'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          My Personal Vault
        </button>

        <button
          onClick={() => setScopeTab('search')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center space-x-1.5 ${
            scopeTab === 'search'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Search className="h-4 w-4" />
          <span>Atlas Semantic Search</span>
        </button>
      </div>

      {errorMessage && (
        <div className="my-6 p-4 bg-red-950/50 border border-red-800 text-red-200 rounded-xl text-xs sm:text-sm flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Content for Search Tab */}
      {scopeTab === 'search' ? (
        <div className="py-6 space-y-6">
          <form onSubmit={handleVectorSearch} className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask a question or enter a semantic query (e.g. 'coding standards' or 'deployment steps')..."
              className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <select
              value={searchScope}
              onChange={(e) => setSearchScope(e.target.value as MemoryScope)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none"
            >
              <option value="team">Team Scope</option>
              <option value="personal">Personal Scope</option>
            </select>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-2 transition disabled:opacity-50 shadow-md shadow-indigo-500/20"
            >
              <Search className="h-4 w-4" />
              <span>{isSearching ? 'Searching...' : 'Vector Search'}</span>
            </button>
          </form>

          <div className="space-y-4">
            {searchResults.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No search results. Enter a query to run semantic retrieval against MongoDB Atlas Vector Search.
              </div>
            ) : (
              searchResults.map((mem) => (
                <div key={mem.id} className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-indigo-400 uppercase tracking-wide">
                      {mem.kind} • Score: {typeof mem.similarity === 'number' ? mem.similarity.toFixed(4) : 'N/A'}
                    </span>
                    <span className="font-mono text-slate-500">ID: {mem.id}</span>
                  </div>
                  <p className="text-slate-200 text-sm">{mem.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Content for Team & Personal Vault */
        <div className="py-6 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Loading memories...</div>
          ) : memories.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No memories found in this view. Use the button above to contribute knowledge.
            </div>
          ) : (
            memories.map((mem) => {
              const isOwner = mem.ownerId === currentTeam.id; // or user match
              const isPending = mem.status === 'pending';
              const isShared = mem.status === 'shared';

              return (
                <div
                  key={mem.id}
                  className={`p-5 bg-slate-900/90 rounded-2xl border shadow-lg space-y-3 transition ${
                    isPending
                      ? 'border-amber-500/40 bg-amber-950/20'
                      : mem.status === 'rejected'
                      ? 'border-red-500/40 bg-red-950/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-950 text-slate-300 border border-slate-800">
                        {mem.kind}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase border ${
                          mem.status === 'shared'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                            : mem.status === 'pending'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                            : mem.status === 'rejected'
                            ? 'bg-red-950/60 text-red-300 border-red-800/60'
                            : mem.status === 'superseded'
                            ? 'bg-slate-950 text-slate-500 border-slate-800'
                            : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60'
                        }`}
                      >
                        {mem.status}
                      </span>
                      <span className="text-xs text-slate-400">Scope: {mem.scope}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs">
                      <button
                        onClick={() => handleStartEdit(mem)}
                        className="inline-flex items-center space-x-1 text-slate-400 hover:text-indigo-400 p-1"
                        title="Edit / alter memory content directly"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleShowAudit(mem)}
                        className="inline-flex items-center space-x-1 text-slate-500 hover:text-indigo-400"
                        title="View audit trail"
                      >
                        <History className="h-3.5 w-3.5" />
                        <span>Audit Log</span>
                      </button>
                      <button
                        onClick={() => handleDelete(mem.id)}
                        className="text-slate-500 hover:text-red-400 p-1"
                        title="Delete memory"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Content body */}
                  <div className="text-sm text-slate-200 font-medium whitespace-pre-wrap leading-relaxed">
                    {mem.content}
                  </div>

                  {/* Rejection notice if rejected */}
                  {mem.rejectionReason && (
                    <div className="p-2.5 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-lg">
                      <b>Rejection Reason:</b> {mem.rejectionReason}
                    </div>
                  )}

                  {/* Superseded lineage & duplicates */}
                  {(mem.supersedes || mem.supersededBy || mem.duplicateOf) && (
                    <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-3 text-xs text-slate-400">
                      {mem.supersedes && (
                        <span className="inline-flex items-center space-x-1 text-amber-400 font-mono">
                          <GitBranch className="h-3 w-3" />
                          <span>Supersedes: {mem.supersedes.slice(-6)}</span>
                        </span>
                      )}
                      {mem.supersededBy && (
                        <span className="inline-flex items-center space-x-1 text-slate-500 font-mono">
                          <GitBranch className="h-3 w-3" />
                          <span>Superseded by: {mem.supersededBy.slice(-6)}</span>
                        </span>
                      )}
                      {mem.duplicateOf && (
                        <span className="inline-flex items-center space-x-1 text-orange-400 font-mono">
                          <Copy className="h-3 w-3" />
                          <span>Near-duplicate of: {mem.duplicateOf.slice(-6)}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    {/* If in Personal vault, allow submitting to team review */}
                    {scopeTab === 'personal' && (mem.status === 'personal' || mem.status === 'rejected') && (
                      <button
                        onClick={() => handleShareToTeam(mem.id)}
                        disabled={isDemoUser}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        <span>Submit for Team Review</span>
                      </button>
                    )}

                    {/* Moderator controls for pending review queue */}
                    {isPending && isModerator && (
                      <>
                        <button
                          onClick={() => handleApprove(mem.id)}
                          disabled={isDemoUser}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Approve & Embed</span>
                        </button>

                        <button
                          onClick={() => {
                            if (isDemoUser) {
                              setErrorMessage('Action disabled in Demo Mode: Demo accounts operate with read-only permissions.');
                              return;
                            }
                            setRejectMemoryId(mem.id);
                            setRejectReason('');
                          }}
                          disabled={isDemoUser}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-800/60 text-red-300 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {/* Propose a linked correction on shared memories */}
                    {isShared && (
                      <button
                        onClick={() => {
                          setCorrectionMemoryId(mem.id);
                          setCorrectionContent(mem.content);
                        }}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Propose Correction</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Create Memory Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Memory</h3>
            <form onSubmit={handleCreateMemory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Memory Statement / Knowledge
                </label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="State the confirmed rule, architectural decision, requirement, or key fact..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Classification Kind
                  </label>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as MemoryKind)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                  >
                    <option value="fact">Fact</option>
                    <option value="decision">Decision</option>
                    <option value="preference">Preference</option>
                    <option value="rule">Rule</option>
                    <option value="note">Note</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Initial Scope
                  </label>
                  <select
                    value={createScope}
                    onChange={(e) => setCreateScope(e.target.value as MemoryScope)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                  >
                    <option value="personal">Personal (Private Vault)</option>
                    <option value="team">Team (Enters Review Queue)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Importance (1 - 5)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={importance}
                    onChange={(e) => setImportance(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Expires In Days <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    placeholder="e.g. 30"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold"
                >
                  Create Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectMemoryId && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Reject Contribution</h3>
            <p className="text-xs text-slate-500 mb-4">
              Provide feedback to the author explaining why this submission cannot be approved.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (e.g. conflicting policy, outdated info)..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setRejectMemoryId(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {correctionMemoryId && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Propose Linked Correction</h3>
            <p className="text-xs text-slate-500 mb-4">
              A correction creates a linked pending submission. The existing memory remains active in retrieval until the correction is formally reviewed and approved.
            </p>
            <textarea
              rows={4}
              value={correctionContent}
              onChange={(e) => setCorrectionContent(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setCorrectionMemoryId(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCorrect}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold"
              >
                Submit Correction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {auditMemory && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 max-h-[85vh] flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Lifecycle Audit Trail</h3>
            <p className="text-xs text-slate-500 font-mono mb-4">Memory ID: {auditMemory.id}</p>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {auditEvents.length === 0 ? (
                <div className="text-sm text-slate-400 py-6 text-center">No audit records found.</div>
              ) : (
                auditEvents.map((evt) => (
                  <div key={evt.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="uppercase text-indigo-700">{evt.eventType}</span>
                      <span className="text-slate-400 font-normal">
                        {new Date(evt.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {evt.metadata && (
                      <pre className="p-2 bg-white rounded border border-slate-200 text-[11px] font-mono text-slate-600 overflow-x-auto">
                        {JSON.stringify(evt.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAuditMemory(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Memory Modal */}
      {editingMemory && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-white">
            <div className="flex items-center space-x-2 mb-2 text-indigo-400">
              <Pencil className="h-5 w-5" />
              <h3 className="text-lg font-bold text-white">Edit & Alter Memory</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Modify this past memory. Vector embeddings will be automatically recalculated in MongoDB Atlas so future assistant turns reflect your changes immediately.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Updated Content
                </label>
                <textarea
                  required
                  rows={4}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Importance (1 - 5)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={editImportance}
                  onChange={(e) => setEditImportance(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMemory(null)}
                  className="px-4 py-2 border border-slate-700 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20"
                >
                  Save Alterations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
