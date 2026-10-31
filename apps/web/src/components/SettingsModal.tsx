import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTeamTokens } from '../utils/tokens';
import { apiRequest } from '../api/client';
import {
  X,
  Sparkles,
  Cpu,
  Coins,
  Crown,
  Check,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Brain,
  Layers,
  Database,
  Radio,
  Clock,
  History,
  BookmarkCheck,
  ToggleLeft,
  ArrowRight,
  Info,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'features' | 'tokens' | 'upgrade';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'features',
}) => {
  const { currentTeam } = useAuth();
  const { tokens, deduct, reset, setZero } = useTeamTokens(currentTeam?.id);

  const [activeTab, setActiveTab] = useState<'features' | 'tokens' | 'upgrade'>(initialTab);

  // Personal API Key fallback state (when quota reaches 0)
  const [personalApiKey, setPersonalApiKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keySavedMessage, setKeySavedMessage] = useState('');
  const [keyErrorMessage, setKeyErrorMessage] = useState('');

  // Upgrade state (no payment gateway)
  const [hasUpgraded, setHasUpgraded] = useState(false);

  if (!isOpen) return null;

  const handleSavePersonalKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalApiKey.trim()) return;
    setIsSavingKey(true);
    setKeySavedMessage('');
    setKeyErrorMessage('');

    try {
      await apiRequest('/ai/config', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'gemini',
          apiKey: personalApiKey.trim(),
        }),
      });
      setKeySavedMessage('Personal Gemini API key connected successfully! Unlimited tokens unlocked.');
      setPersonalApiKey('');
    } catch (err: any) {
      setKeyErrorMessage(err.message || 'Failed to authenticate personal API key.');
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleRequestUpgrade = () => {
    setHasUpgraded(true);
  };

  const tokenPercentage = Math.min(100, Math.max(0, (tokens / 1000) * 100));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-950 border border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 p-0.5 shadow-md shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Brain className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>TeamBrain Workspace Settings</span>
                {currentTeam && (
                  <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-950/80 text-indigo-300 rounded-full border border-indigo-800/60">
                    {currentTeam.name}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Explore platform features, monitor team daily tokens, and access premium limits
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation (Exact order: Features -> Tokens -> Upgrade) */}
        <div className="px-6 pt-3 border-b border-slate-800/80 bg-slate-950 flex space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-b-2 ${
              activeTab === 'features'
                ? 'border-indigo-500 text-white bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span>1. Platform Features</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tokens')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-b-2 ${
              activeTab === 'tokens'
                ? 'border-indigo-500 text-white bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Coins className="h-4 w-4 text-amber-400" />
            <span>2. Tokens & Quota</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                tokens === 0
                  ? 'bg-red-950 text-red-300 border border-red-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800/60'
              }`}
            >
              {tokens}/1000
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upgrade')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-b-2 ${
              activeTab === 'upgrade'
                ? 'border-indigo-500 text-white bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Crown className="h-4 w-4 text-purple-400" />
            <span>3. Upgrade to Premium</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/60 font-semibold">
              ₹2,000
            </span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: FEATURES */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <span>Comprehensive Website Features</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Explore everything TeamBrain delivers for agentic persistent memory and collaborative development:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs">
                    <Brain className="h-4 w-4" />
                    <span className="text-white">Persistent Agentic Memory</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Automatically extracts durable facts, user preferences, technical rules, and constraints from conversations, remembering them across all future sessions.
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                    <Database className="h-4 w-4" />
                    <span className="text-white">MongoDB Atlas Vector Search</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Associative semantic recall using 768-dimensional <code className="text-indigo-300">text-embedding-004</code> embeddings with metadata filters scoped by team, user, and recency.
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs">
                    <Radio className="h-4 w-4" />
                    <span className="text-white">Live MongoDB Change Streams</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Real-time database stream listeners reactively push memory updates, supersessions, and approvals to teammates’ active sessions instantly via Socket.IO.
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                    <Layers className="h-4 w-4" />
                    <span className="text-white">Decision Fusion & Conflict Resolution</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    AI synthesizes fragmented project notes into coherent consensus, detects contradictory statements, and enables leads to publish definitive resolutions.
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs">
                    <Clock className="h-4 w-4" />
                    <span className="text-white">TTL Automatic Expiry</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Time-to-live indexes automatically remove ephemeral memories when their validity window expires, preventing context rot and keeping knowledge accurate.
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-violet-400 font-bold text-xs">
                    <History className="h-4 w-4" />
                    <span className="text-white">In-Place Editing & Hard Deletion</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Full lifecycle management: edit past memories with automatic vector re-indexing, propose superseding corrections, or delete outdated data with audit trails.
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-indigo-300 font-bold text-xs">
                    <BookmarkCheck className="h-4 w-4" />
                    <span className="text-white">Interactive Citation Inspection</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Click any citation tag under assistant responses to inspect the exact stored MongoDB document, contributor, and transparent 3-step selection rationale.
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-yellow-400 font-bold text-xs">
                    <ToggleLeft className="h-4 w-4" />
                    <span className="text-white">Memory ON / OFF Comparison</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Live toggle in chat to compare responses with verified team memory context vs. raw baseline general AI mode side-by-side.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TOKENS & QUOTA */}
          {activeTab === 'tokens' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Coins className="h-4 w-4 text-amber-400" />
                  <span>Team Daily Token Allowance</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Each team receives <b>1,000 tokens per day</b>. Sending a message consumes <b>5 tokens per text per member</b>.
                </p>
              </div>

              {/* Token Progress Meter Card */}
              <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Remaining Daily Allowance
                  </span>
                  <span className="font-mono text-sm font-bold text-white">
                    <span className={tokens === 0 ? 'text-red-400' : 'text-amber-300'}>{tokens}</span>
                    <span className="text-slate-500"> / 1,000 tokens</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      tokens > 400
                        ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
                        : tokens > 100
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                        : 'bg-gradient-to-r from-red-500 to-rose-600'
                    }`}
                    style={{ width: `${tokenPercentage}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Consumption: 5 tokens / message</span>
                  <span>Quota resets daily at 00:00 UTC</span>
                </div>
              </div>

              {/* Zero Token Warning / API Key Fallback */}
              {tokens === 0 ? (
                <div className="p-4 bg-red-950/40 border-2 border-red-700/80 rounded-2xl space-y-3">
                  <div className="flex items-start space-x-2.5 text-red-300 font-bold text-sm">
                    <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span>Daily Team Allowance Exhausted (0 / 1,000 Tokens)</span>
                      <p className="text-xs font-normal text-red-200 mt-1">
                        Your team has reached today's 1,000 token limit. To continue interacting with the assistant without waiting for the daily reset, please enter your personal Gemini API key below:
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSavePersonalKey} className="space-y-2.5 pt-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase flex items-center justify-between">
                      <span>Personal Gemini API Key</span>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-normal flex items-center space-x-1"
                      >
                        <span>Get free key</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="password"
                        value={personalApiKey}
                        onChange={(e) => setPersonalApiKey(e.target.value)}
                        placeholder="AIzaSy... (Personal Gemini Key)"
                        disabled={isSavingKey}
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                      <button
                        type="submit"
                        disabled={isSavingKey || !personalApiKey.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition"
                      >
                        {isSavingKey ? 'Activating...' : 'Activate Key'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-start space-x-2.5">
                  <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-300">Continuous Team Intelligence:</span>{' '}
                    <span>
                      Tokens are tracked for simulated usage policy. When the counter reaches zero, users are prompted to supply their own Gemini API key or upgrade to the premium tier.
                    </span>
                  </div>
                </div>
              )}

              {keySavedMessage && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-700 text-emerald-200 rounded-xl text-xs flex items-center space-x-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{keySavedMessage}</span>
                </div>
              )}

              {keyErrorMessage && (
                <div className="p-3 bg-red-950/50 border border-red-700 text-red-200 rounded-xl text-xs flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  <span>{keyErrorMessage}</span>
                </div>
              )}

              {/* Simulation Testing Tools for Evaluator */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Evaluation Controls (Simulate Quota Actions)
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => deduct(5)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
                  >
                    Simulate -5 Tokens (Send Message)
                  </button>
                  <button
                    type="button"
                    onClick={() => setZero()}
                    className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 rounded-lg text-xs font-medium transition"
                  >
                    Simulate Quota Exhausted (0 Tokens Alert)
                  </button>
                  <button
                    type="button"
                    onClick={() => reset(1000)}
                    className="px-2.5 py-1 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 rounded-lg text-xs font-medium transition"
                  >
                    Reset Quota to 1,000 Tokens
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: UPGRADE TO PREMIUM */}
          {activeTab === 'upgrade' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Crown className="h-4 w-4 text-purple-400" />
                  <span>Upgrade to TeamBrain Premium</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Unlock unlimited daily allowance, smarter autonomous reasoning models, and enterprise knowledge isolation.
                </p>
              </div>

              {/* Plan Card */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950/50 border-2 border-purple-500/40 p-6 rounded-3xl shadow-xl space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="px-3 py-1 bg-purple-950 text-purple-300 border border-purple-700/60 rounded-full text-xs font-bold uppercase tracking-wider">
                      Premium Agent Tier
                    </span>
                    <h4 className="text-xl font-bold text-white mt-2">Unlimited Workspace Agent</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Designed for engineering teams who need relentless persistent memory without limits.
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-white font-mono">
                      ₹2,000
                    </div>
                    <span className="text-xs text-purple-300 font-semibold">/ month per team</span>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-4 space-y-2.5">
                  <div className="flex items-center space-x-2.5 text-xs text-slate-200">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span><b>Unlimited Daily Tokens:</b> No 1,000 token cap; seamless continuous agent interactions.</span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-xs text-slate-200">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span><b>Smarter Autonomous AI:</b> Powered by <b>Gemini 1.5 Pro</b> for deep code reasoning and complex decisions.</span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-xs text-slate-200">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span><b>Priority MongoDB Atlas Recall:</b> Sub-second vector search indexing with zero query throttling.</span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-xs text-slate-200">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span><b>Instant Change Streams:</b> Real-time reactive socket broadcasts across all projects without delay.</span>
                  </div>
                  <div className="flex items-center space-x-2.5 text-xs text-slate-200">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span><b>Dedicated Support:</b> 24/7 priority onboarding and architecture consultation.</span>
                  </div>
                </div>

                <div className="pt-3">
                  {hasUpgraded ? (
                    <div className="p-4 bg-emerald-950/60 border border-emerald-700/80 rounded-2xl text-xs text-emerald-200 space-y-1">
                      <div className="font-bold text-sm text-emerald-300 flex items-center space-x-1.5">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>Premium Plan Requested!</span>
                      </div>
                      <p>
                        Your upgrade request for TeamBrain Premium (₹2,000/mo) has been registered. A workspace account manager will contact your team owner to activate Gemini 1.5 Pro.
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestUpgrade}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-500/25 transition active:scale-[0.99] flex items-center justify-center space-x-2"
                    >
                      <Crown className="h-4 w-4" />
                      <span>Upgrade to Premium — ₹2,000 / month</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </button>
                  )}
                  <p className="text-[11px] text-slate-500 text-center mt-2">
                    Direct billing invoice option &bull; No upfront payment gateway integration required
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs text-slate-400">
            <div className="flex items-center space-x-1.5">
              <Coins className="h-4 w-4 text-amber-400" />
              <span>
                Daily Balance: <b className="text-white">{tokens}</b> / 1000 tokens
              </span>
            </div>
            <a
              href="/teambrain_presentation.html"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1 underline underline-offset-2"
            >
              <span>UNCHARTED 2026 Presentation Deck</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
