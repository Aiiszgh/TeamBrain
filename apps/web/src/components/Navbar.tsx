import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Brain,
  MessageSquare,
  Sparkles,
  FolderGit2,
  Settings,
  LogOut,
  Users,
  PlusCircle,
} from 'lucide-react';
import { apiRequest } from '../api/client';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, currentTeam, currentRole, memberships, selectTeam, logout, refreshUser } =
    useAuth();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setIsJoining(true);
    setJoinError('');
    try {
      await apiRequest('/teams/join', {
        method: 'POST',
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      setShowJoinModal(false);
      setJoinCode('');
      await refreshUser();
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join team');
    } finally {
      setIsJoining(false);
    }
  };

  const isDemoUser = Boolean(user?.email?.endsWith('@teambrain.io'));

  return (
    <header className="bg-[#0B0F19]/90 border-b border-slate-800 text-slate-200 backdrop-blur-xl sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-6">
            <div
              className="flex items-center space-x-2 text-indigo-400 font-bold text-xl cursor-pointer"
              onClick={() => setActiveTab('chat')}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 p-0.5 shadow-md shadow-indigo-500/30">
                <div className="w-full h-full bg-[#0B0F19] rounded-[6px] flex items-center justify-center">
                  <Brain className="h-4 w-4 text-indigo-400" />
                </div>
              </div>
              <span className="text-white font-black tracking-tight">TeamBrain</span>
            </div>

            {/* Team Switcher */}
            {currentTeam && (
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Team</span>
                <select
                  value={currentTeam.id}
                  onChange={(e) => {
                    const match = memberships.find((m) => m.team.id === e.target.value);
                    if (match) selectTeam(match.team);
                  }}
                  className="bg-slate-900 border border-slate-700 text-white text-xs font-medium rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {memberships.map((m) => (
                    <option key={m.team.id} value={m.team.id}>
                      {m.team.name} ({m.role})
                    </option>
                  ))}
                </select>
                {!isDemoUser && (
                  <button
                    onClick={() => setShowJoinModal(true)}
                    title="Join another team"
                    className="text-slate-400 hover:text-indigo-400 p-1 transition"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex space-x-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'chat'
                  ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Assistant</span>
            </button>

            <button
              onClick={() => setActiveTab('memories')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'memories'
                  ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Memories & Review</span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'projects'
                  ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <FolderGit2 className="h-3.5 w-3.5" />
              <span>Projects & Tasks</span>
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'members' || activeTab === 'settings'
                  ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Members</span>
            </button>
          </nav>

          {/* User profile, demo badge, and logout */}
          <div className="flex items-center space-x-3">
            {isDemoUser && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                <span>Demo (Read-Only)</span>
              </span>
            )}
            <div className="text-right">
              <div className="text-xs font-bold text-white">{user?.name}</div>
              <div className="text-[10px] text-slate-400 flex items-center justify-end space-x-1">
                <span>{currentRole || 'member'}</span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Join Team Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-white">
            <h3 className="text-lg font-bold text-white mb-2">Join a Team</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter the invitation code provided by your team owner or administrator.
            </p>
            {joinError && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">
                {joinError}
              </div>
            )}
            <form onSubmit={handleJoinTeam}>
              <input
                type="text"
                placeholder="Enter 32-character invite code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs mb-4 font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-3.5 py-2 border border-slate-700 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJoining}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {isJoining ? 'Joining...' : 'Join Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
