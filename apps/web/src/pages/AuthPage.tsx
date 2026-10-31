import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Brain,
  ShieldCheck,
  Sparkles,
  Lock,
  Mail,
  User,
  Users,
  Eye,
  EyeOff,
  CheckCircle2,
  BookmarkCheck,
  Building,
  KeyRound,
  ArrowRight,
  Zap,
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isRegister) {
        if (password.length < 10) {
          throw new Error('Password must be at least 10 characters for security');
        }
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          teamName: teamName.trim() || undefined,
          inviteCode: inviteCode.trim() || undefined,
        });
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoFill = (role: 'lead' | 'new') => {
    setError('');
    if (role === 'lead') {
      setIsRegister(false);
      setEmail('alex@teambrain.io');
      setPassword('Password123!');
    } else {
      setIsRegister(true);
      setName('Sarah Chen');
      setEmail('sarah.chen@teambrain.io');
      setPassword('Password123!');
      setTeamName('Core Architecture');
      setInviteCode('');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col lg:grid lg:grid-cols-12 overflow-x-hidden">
      {/* LEFT COLUMN: Human Story, Brand & Tangible Memory Preview (7 cols) */}
      <aside className="lg:col-span-7 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header / Track Badge */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-400 p-0.5 shadow-lg shadow-indigo-500/25">
              <div className="w-full h-full bg-slate-950/80 backdrop-blur rounded-[14px] flex items-center justify-center">
                <Brain className="h-6 w-6 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block">
                TeamBrain
              </span>
              <span className="text-[11px] text-indigo-300 font-medium block">
                Agentic Memory & Knowledge Workspace
              </span>
            </div>
          </div>

          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 backdrop-blur border border-white/15 rounded-full text-xs font-medium text-indigo-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Track 1: Agentic Memory</span>
          </div>
        </div>

        {/* Center Hero Story */}
        <div className="my-10 lg:my-auto relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold mb-4">
            <Zap className="h-3.5 w-3.5 text-indigo-400" />
            <span>Never start from zero again</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            An AI that actually remembers what your team decided.
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            No more re-explaining architectural rules, database conventions, or business constraints
            every sprint. TeamBrain turns transient conversations into verified, searchable memory
            that actively shapes how your coding agents behave.
          </p>

          {/* Interactive Memory Preview Card */}
          <div className="mt-8 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-200">
                <BookmarkCheck className="h-4 w-4 text-indigo-400" />
                <span>Verified Team Memory #m-7982a1</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Cosine Match: 0.96
              </span>
            </div>

            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Architecture Decision • Confirmed Consensus
              </div>
              <p className="text-sm font-medium text-white mt-1">
                “All payments and payouts must use UUIDv7 IDs, strict ACID transactions, and zero retry loops on declined cards.”
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-start space-x-3 text-xs text-slate-300 bg-black/20 p-3 rounded-xl">
              <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                AI
              </div>
              <div>
                <span className="text-indigo-300 font-semibold block">Assistant Response Infused with Memory:</span>
                <span className="text-slate-300 mt-0.5 block">
                  “Applying Team Decision #m-7982a1: Generated the payment service with UUIDv7 schema and non-retrying transaction handling.”
                </span>
              </div>
            </div>
          </div>

          {/* 3 Value Pillars */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-start space-x-3 bg-white/5 p-3.5 rounded-xl border border-white/10">
              <Sparkles className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white">Persistent Memory</h4>
                <p className="text-[11px] text-slate-300 mt-0.5">Lives across turns, teammates, and restarts.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 bg-white/5 p-3.5 rounded-xl border border-white/10">
              <Users className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white">Team Consensus</h4>
                <p className="text-[11px] text-slate-300 mt-0.5">Human review queue for verified knowledge.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 bg-white/5 p-3.5 rounded-xl border border-white/10">
              <ShieldCheck className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white">Vector Recall</h4>
                <p className="text-[11px] text-slate-300 mt-0.5">Atlas Vector Search with strict RBAC filters.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Human Testimonial & Team Avatars */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-pink-500 flex items-center justify-center font-bold text-sm text-slate-950 ring-2 ring-white/20">
              AR
            </div>
            <div>
              <p className="text-xs font-semibold text-white">
                “TeamBrain ended our game of telephone. Our coding agents follow our real constraints.”
              </p>
              <p className="text-[11px] text-slate-400">
                Alex Rivera • Staff Infrastructure Architect
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-indigo-300 font-medium shrink-0">
            <div className="flex -space-x-1.5 overflow-hidden">
              <div className="inline-block h-6 w-6 rounded-full bg-indigo-400 ring-2 ring-slate-900 text-[10px] font-bold text-white flex items-center justify-center">
                SC
              </div>
              <div className="inline-block h-6 w-6 rounded-full bg-emerald-400 ring-2 ring-slate-900 text-[10px] font-bold text-white flex items-center justify-center">
                DK
              </div>
              <div className="inline-block h-6 w-6 rounded-full bg-violet-400 ring-2 ring-slate-900 text-[10px] font-bold text-white flex items-center justify-center">
                MP
              </div>
            </div>
            <span>Used by teams worldwide</span>
          </div>
        </div>
      </aside>

      {/* RIGHT COLUMN: Humanized, Spacious Authentication Portal (5 cols) */}
      <main className="lg:col-span-5 flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-12 xl:px-16 bg-white min-h-screen">
        <div className="max-w-md w-full mx-auto">
          {/* Welcome greeting */}
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {isRegister ? 'Start remembering together ✨' : 'Welcome back, builder 👋'}
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              {isRegister
                ? 'Create your account to start curating team knowledge and persistent memories.'
                : 'Sign in to access your team knowledge vault and collaborative assistant.'}
            </p>
          </div>

          {/* Quick Demo Credentials Assistant */}
          <div className="mb-6 p-3.5 bg-indigo-50/80 border border-indigo-100 rounded-2xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-indigo-900">
              <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
              <div>
                <span className="font-semibold block">Exploring or testing the demo?</span>
                <span className="text-slate-500 text-[11px]">One-click autofill with test credentials</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDemoFill(isRegister ? 'new' : 'lead')}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-xs transition shadow-sm shrink-0 flex items-center space-x-1"
            >
              <span>Auto-fill</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError('');
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                !isRegister
                  ? 'bg-white shadow text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError('');
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                isRegister
                  ? 'bg-white shadow text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-start space-x-2.5 animate-fadeIn">
              <span className="font-bold shrink-0">Error:</span>
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Your Full Name
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@teambrain.io"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                {isRegister && (
                  <span className="text-[11px] text-slate-400">At least 10 characters</span>
                )}
              </div>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={isRegister ? 10 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="pt-2 border-t border-slate-100 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Team or Organization Name <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Building className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. Platform Infrastructure"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Team Invitation Code <span className="text-slate-400 font-normal lowercase">(if invited by a lead)</span>
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Paste 32-character invite code"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 text-sm transition-all duration-150 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{isRegister ? 'Setting up workspace...' : 'Signing you in...'}</span>
                </>
              ) : (
                <>
                  <span>{isRegister ? 'Create Account & Team' : 'Sign In to Workspace'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Privacy & Trust Footnote */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center space-x-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Private memory vaults &bull; MongoDB Atlas Vector Search &bull; RBAC Protected</span>
          </div>
        </div>
      </main>
    </div>
  );
};
