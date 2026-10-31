import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { ITeamMember, TeamRole } from '@teambrain/shared';
import { Users, KeyRound, Copy, Check, UserPlus, Trash2, ShieldAlert } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentTeam, currentRole, user } = useAuth();
  const isDemoUser = Boolean(user?.email?.endsWith('@teambrain.io'));
  const [members, setMembers] = useState<ITeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Add member form
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<'admin' | 'member'>('member');
  const [isAdding, setIsAdding] = useState(false);

  // Invite code generation
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [maxUses, setMaxUses] = useState(5);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const isOwner = currentRole === 'owner';
  const isModerator = currentRole === 'owner' || currentRole === 'admin';

  const loadMembers = async () => {
    if (!currentTeam) return;
    setIsLoading(true);
    try {
      const list = await apiRequest<ITeamMember[]>(`/teams/${currentTeam.id}/members`);
      setMembers(list);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch team members');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [currentTeam]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoUser) {
      setErrorMessage('Action disabled in Demo Mode: Demo accounts operate with read-only permissions.');
      return;
    }
    if (!currentTeam || !addEmail.trim()) return;
    setIsAdding(true);
    setErrorMessage('');
    try {
      const added = await apiRequest<ITeamMember>(`/teams/${currentTeam.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: addEmail.trim(), role: addRole }),
      });
      setMembers([...members, added]);
      setAddEmail('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add member');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: TeamRole) => {
    if (isDemoUser) {
      setErrorMessage('Action disabled in Demo Mode: Demo accounts operate with read-only permissions.');
      return;
    }
    if (!currentTeam) return;
    try {
      await apiRequest(`/teams/${currentTeam.id}/members/${targetUserId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      setMembers(
        members.map((m) => (m.userId === targetUserId ? { ...m, role: newRole } : m))
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (isDemoUser) {
      setErrorMessage('Action disabled in Demo Mode: Demo accounts operate with read-only permissions.');
      return;
    }
    if (!currentTeam || !confirm('Remove this user from the team?')) return;
    try {
      await apiRequest(`/teams/${currentTeam.id}/members/${targetUserId}`, {
        method: 'DELETE',
      });
      setMembers(members.filter((m) => m.userId !== targetUserId));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove member');
    }
  };

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoUser) {
      setErrorMessage('Action disabled in Demo Mode: Demo accounts operate with read-only permissions.');
      return;
    }
    if (!currentTeam) return;
    setIsGenerating(true);
    setErrorMessage('');
    setGeneratedCode(null);
    setHasCopied(false);

    try {
      const res = await apiRequest<{ code: string }>(
        `/teams/${currentTeam.id}/invitations`,
        {
          method: 'POST',
          body: JSON.stringify({
            role: inviteRole,
            maxUses: Number(maxUses),
            expiresInDays: Number(expiresInDays),
          }),
        }
      );
      setGeneratedCode(res.code);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate invitation code');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2500);
  };

  if (!currentTeam) {
    return <div className="p-8 text-center text-slate-500">Please select a team.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-slate-200">
      <div>
        <h1 className="text-2xl font-bold text-white">Members & Team Settings</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage team memberships, assign administrative roles, and create invitation codes.
        </p>
      </div>

      {isDemoUser && (
        <div className="p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span><b>Demo Mode Active:</b> Team settings modifications and invitation code generation are disabled for demo accounts.</span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-950/50 border border-red-800 text-red-200 rounded-xl text-xs sm:text-sm">
          {errorMessage}
        </div>
      )}

      {/* Invitation Code Generator Box */}
      {isModerator && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-base">
            <KeyRound className="h-5 w-5" />
            <span className="text-white">Generate Hashed Invitation Code</span>
          </div>
          <p className="text-xs text-slate-400">
            Create an invitation code with limited uses and expiration. Users can register with this code or join via the team switcher.
          </p>

          <form onSubmit={handleGenerateInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Assigned Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Max Uses
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Expires In (Days)
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isGenerating || isDemoUser}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 shadow-md shadow-indigo-500/20"
            >
              {isGenerating ? 'Generating...' : 'Create Invite Code'}
            </button>
          </form>

          {/* Generated Code Reveal */}
          {generatedCode && (
            <div className="mt-4 p-4 bg-indigo-950/40 border border-indigo-700/60 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-300 block mb-1">
                  Active One-Time Invite Code (Save this, it will not be displayed again):
                </span>
                <code className="text-base font-mono font-bold text-white bg-slate-950 px-3 py-1 rounded border border-indigo-700/60">
                  {generatedCode}
                </code>
              </div>
              <button
                type="button"
                onClick={copyToClipboard}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-indigo-500/50 text-indigo-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition"
              >
                {hasCopied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Existing User by Email */}
      {isModerator && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-base">
            <UserPlus className="h-5 w-5" />
            <span className="text-white">Add Existing User by Email</span>
          </div>

          <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="user@example.com"
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as 'admin' | 'member')}
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={isAdding || isDemoUser}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
            >
              {isAdding ? 'Adding...' : 'Add to Team'}
            </button>
          </form>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">
              Team Roster ({members.length})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Joined Date</th>
                {isModerator && <th className="px-6 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {members.map((m) => {
                const isSelf = m.userId === user?.id;

                return (
                  <tr key={m.userId} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 font-semibold text-white">
                      {m.name} {isSelf && <span className="text-xs text-indigo-400 font-normal">(You)</span>}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{m.email}</td>
                    <td className="px-6 py-4">
                      {isOwner && !isSelf && !isDemoUser ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.userId, e.target.value as TeamRole)}
                          className="px-2 py-1 bg-slate-950 border border-slate-700 text-white rounded-lg text-xs font-semibold uppercase focus:outline-none"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-semibold uppercase border ${
                            m.role === 'owner'
                              ? 'bg-purple-950/60 text-purple-300 border-purple-800/60'
                              : m.role === 'admin'
                              ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          {m.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(m.joinedAt).toLocaleDateString()}
                    </td>
                    {isModerator && (
                      <td className="px-6 py-4 text-right">
                        {!isSelf && m.role !== 'owner' && !isDemoUser && (
                          <button
                            onClick={() => handleRemoveMember(m.userId)}
                            className="text-slate-500 hover:text-red-400 p-1 transition"
                            title="Remove member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
