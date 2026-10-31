import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { ITeamMember, TeamRole } from '@teambrain/shared';
import { Users, KeyRound, Copy, Check, UserPlus, Trash2, ShieldAlert } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentTeam, currentRole, user } = useAuth();
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Members & Team Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage team memberships, assign administrative roles, and create invitation codes.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {errorMessage}
        </div>
      )}

      {/* Invitation Code Generator Box */}
      {isModerator && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-indigo-600 font-bold text-base">
            <KeyRound className="h-5 w-5" />
            <span>Generate Hashed Invitation Code</span>
          </div>
          <p className="text-xs text-slate-500">
            Create an invitation code with limited uses and expiration. Users can register with this code or join via the team switcher.
          </p>

          <form onSubmit={handleGenerateInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Assigned Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Max Uses
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Expires In (Days)
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Create Invite Code'}
            </button>
          </form>

          {/* Generated Code Reveal */}
          {generatedCode && (
            <div className="mt-4 p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-900 block mb-1">
                  Active One-Time Invite Code (Save this, it will not be displayed again):
                </span>
                <code className="text-base font-mono font-bold text-indigo-700 bg-white px-3 py-1 rounded border border-indigo-200">
                  {generatedCode}
                </code>
              </div>
              <button
                type="button"
                onClick={copyToClipboard}
                className="px-4 py-2 bg-white hover:bg-indigo-50 border border-indigo-300 text-indigo-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition"
              >
                {hasCopied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
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
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-800 font-bold text-base">
            <UserPlus className="h-5 w-5 text-indigo-600" />
            <span>Add Existing User by Email</span>
          </div>

          <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="user@example.com"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
            />
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as 'admin' | 'member')}
              className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={isAdding}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
            >
              {isAdding ? 'Adding...' : 'Add to Team'}
            </button>
          </form>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-slate-500" />
            <h2 className="text-base font-bold text-slate-900">
              Team Roster ({members.length})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Joined Date</th>
                {isModerator && <th className="px-6 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => {
                const isSelf = m.userId === user?.id;

                return (
                  <tr key={m.userId} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {m.name} {isSelf && <span className="text-xs text-indigo-600 font-normal">(You)</span>}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{m.email}</td>
                    <td className="px-6 py-4">
                      {isOwner && !isSelf ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.userId, e.target.value as TeamRole)}
                          className="px-2 py-1 border border-slate-300 rounded-lg text-xs font-semibold bg-white uppercase"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-semibold uppercase ${
                            m.role === 'owner'
                              ? 'bg-purple-100 text-purple-800'
                              : m.role === 'admin'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-slate-100 text-slate-700'
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
                        {!isSelf && m.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveMember(m.userId)}
                            className="text-slate-400 hover:text-red-600 p-1"
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
