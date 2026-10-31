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

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xl cursor-pointer" onClick={() => setActiveTab('chat')}>
              <Brain className="h-7 w-7" />
              <span>TeamBrain</span>
            </div>

            {/* Team Switcher */}
            {currentTeam && (
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Team</span>
                <select
                  value={currentTeam.id}
                  onChange={(e) => {
                    const match = memberships.find((m) => m.team.id === e.target.value);
                    if (match) selectTeam(match.team);
                  }}
                  className="bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-indigo-500"
                >
                  {memberships.map((m) => (
                    <option key={m.team.id} value={m.team.id}>
                      {m.team.name} ({m.role})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowJoinModal(true)}
                  title="Join another team"
                  className="text-slate-500 hover:text-indigo-600 p-1"
                >
                  <PlusCircle className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex space-x-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                activeTab === 'chat'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Assistant</span>
            </button>

            <button
              onClick={() => setActiveTab('memories')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                activeTab === 'memories'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Memories & Review</span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                activeTab === 'projects'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FolderGit2 className="h-4 w-4" />
              <span>Projects & Tasks</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                activeTab === 'settings'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Members & Settings</span>
            </button>
          </nav>

          {/* User profile and logout */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-800">{user?.name}</div>
              <div className="text-xs text-slate-500 flex items-center justify-end space-x-1">
                <span>{currentRole || 'member'}</span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Join Team Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Join a Team</h3>
            <p className="text-sm text-slate-600 mb-4">
              Enter the invitation code provided by your team owner or administrator.
            </p>
            {joinError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                {joinError}
              </div>
            )}
            <form onSubmit={handleJoinTeam}>
              <input
                type="text"
                placeholder="Enter 32-character invite code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-4 font-mono"
                required
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJoining}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
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
