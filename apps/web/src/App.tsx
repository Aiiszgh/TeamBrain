import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthPage } from './pages/AuthPage';
import { ChatPage } from './pages/ChatPage';
import { MemoriesPage } from './pages/MemoriesPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SettingsModal } from './components/SettingsModal';
import { useTeamTokens } from './utils/tokens';
import { Brain, Settings, Coins } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isLoading, currentTeam } = useAuth();
  const [activeTab, setActiveTab] = useState('chat');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const { tokens } = useTeamTokens(currentTeam?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white">
        <div className="flex flex-col items-center space-y-3">
          <Brain className="h-10 w-10 text-indigo-400 animate-pulse" />
          <span className="text-sm font-semibold text-slate-400">Loading TeamBrain...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white relative">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col">
        {activeTab === 'chat' && <ChatPage onNavigateTab={setActiveTab} />}
        {activeTab === 'memories' && <MemoriesPage />}
        {activeTab === 'projects' && <ProjectsPage />}
        {(activeTab === 'members' || activeTab === 'settings') && <SettingsPage />}
      </div>

      {/* Floating lower-left settings option when not on chat sidebar */}
      {activeTab !== 'chat' && (
        <button
          type="button"
          onClick={() => setIsSettingsModalOpen(true)}
          className="fixed bottom-5 left-5 z-40 bg-slate-900/95 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-indigo-500/80 rounded-2xl px-3.5 py-2 shadow-2xl backdrop-blur-md flex items-center space-x-2 text-xs font-semibold cursor-pointer transition group"
          title="Open Settings, Features & Token Quota"
        >
          <div className="w-5 h-5 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 group-hover:rotate-45 transition-transform">
            <Settings className="h-3.5 w-3.5" />
          </div>
          <span>Settings</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950 text-amber-300 border border-slate-800 font-mono">
            {tokens}/1000
          </span>
        </button>
      )}

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};
export default App;
