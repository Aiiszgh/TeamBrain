import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Brain,
  Sparkles,
  Zap,
  Users,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  MessageSquare,
  Layers,
  Lock,
  Eye,
  EyeOff,
  Mail,
  Building,
  KeyRound,
  Star,
  Cpu,
  Database,
  History,
  Share2,
  ArrowLeft,
  BookmarkCheck,
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();

  // Navigation state between Landing Cover Page and Auth Form Page
  const [currentView, setCurrentView] = useState<'cover' | 'auth'>('cover');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (authMode === 'register') {
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

  const handleDemoFill = (type: 'member' | 'lead') => {
    setError('');
    if (type === 'lead') {
      setAuthMode('login');
      setEmail('alex@teambrain.io');
      setPassword('Password123!');
    } else {
      setAuthMode('register');
      setName('Sarah Chen');
      setEmail('sarah.chen@teambrain.io');
      setPassword('Password123!');
      setTeamName('Core Architecture');
      setInviteCode('');
    }
  };

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setCurrentView('auth');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* =========================================================================
   * VIEW 1: AUTHENTICATION PORTAL (SIGN IN / CREATE ACCOUNT)
   * ========================================================================= */
  if (currentView === 'auth') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          {/* Back to cover page button */}
          <button
            type="button"
            onClick={() => setCurrentView('cover')}
            className="mb-6 inline-flex items-center space-x-2 text-xs font-medium text-slate-400 hover:text-white transition group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1 text-indigo-400" />
            <span>Back to Cover Page</span>
          </button>

          {/* Brand header */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 p-0.5 shadow-lg shadow-indigo-500/30">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Brain className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block">TeamBrain</span>
              <span className="text-[11px] text-slate-400 block">Collective Intelligence Workspace</span>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {authMode === 'register' ? 'Create your account' : 'Sign in to your workspace'}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {authMode === 'register'
              ? 'Start capturing team decisions and permanent memory in minutes.'
              : 'Access your team memories, projects, and AI assistant.'}
          </p>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl">
            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-slate-950 p-1 mb-6 border border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError('');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  authMode === 'login'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setError('');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  authMode === 'register'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Quick Demo Autofill Hint */}
            <div className="mb-5 p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl flex items-center justify-between text-xs text-indigo-200">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span>Testing out the app?</span>
              </div>
              <button
                type="button"
                onClick={() => handleDemoFill(authMode === 'register' ? 'member' : 'lead')}
                className="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium rounded-lg text-[11px] transition"
              >
                Auto-fill Demo
              </button>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-950/50 border border-red-800 text-red-200 text-xs rounded-xl flex items-start space-x-2">
                <span className="font-bold text-red-400">Notice:</span>
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Users className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@teambrain.io"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  {authMode === 'register' && (
                    <span className="text-[11px] text-slate-500">Min 10 characters</span>
                  )}
                </div>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={authMode === 'register' ? 10 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {authMode === 'register' && (
                <div className="pt-2 border-t border-slate-800 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Team or Org Name <span className="text-slate-500 font-normal lowercase">(optional)</span>
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Building className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Platform Infrastructure"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Invitation Code <span className="text-slate-500 font-normal lowercase">(if invited)</span>
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="Paste 32-character invite code"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 text-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{authMode === 'register' ? 'Create Account & Enter' : 'Sign In to Workspace'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-center space-x-2 text-[11px] text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Encrypted vaults &bull; Role-based access &bull; Private team memory</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================
   * VIEW 2: BEAUTIFUL, ATTRACTIVE COVER / LANDING PAGE
   * ========================================================================= */
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white selection:bg-indigo-500 selection:text-white overflow-x-hidden font-sans">
      {/* Ambient background glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[55rem] h-[30rem] bg-gradient-to-b from-indigo-600/20 via-violet-600/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[40rem] h-[40rem] bg-indigo-500/10 blur-[150px] pointer-events-none" />
      <div className="fixed top-1/3 -left-40 w-[30rem] h-[30rem] bg-cyan-500/10 blur-[150px] pointer-events-none" />

      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#0B0F19]/80 border-b border-slate-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 p-0.5 shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition">
              <div className="w-full h-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center">
                <Brain className="h-5 w-5 text-indigo-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <span className="text-xl font-black tracking-tight text-white flex items-center space-x-1">
              <span>TeamBrain</span>
              <span className="text-indigo-400">.</span>
            </span>
          </div>

          {/* Quick anchor links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#demo" className="hover:text-white transition">How It Works</a>
            <a href="#testimonials" className="hover:text-white transition">Feedback</a>
          </nav>

          {/* TOP RIGHT 2 BUTTONS: SIGN IN & CREATE ACCOUNT */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-500 rounded-xl hover:bg-slate-800/50 transition shadow-sm"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition transform active:scale-95"
            >
              Create Account
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION (Cover with entrance animation & curiosity hook) */}
      <section className="relative min-h-[calc(100vh-5rem)] flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-8 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
            <span>The Collective Memory Layer for Modern Engineering Teams</span>
          </div>

          {/* Site name with prominent animation */}
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white mb-6">
            <span className="block animate-title-reveal bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
              TeamBrain
            </span>
          </h1>

          {/* Compelling curiosity subheadline */}
          <p className="text-lg sm:text-xl lg:text-2xl text-slate-300 font-normal max-w-2xl mx-auto leading-relaxed mb-10">
            Every week your team discusses architecture, makes decisions, and sets conventions.
            <br className="hidden sm:inline" />
            <span className="text-white font-medium"> Stop letting that knowledge evaporate into chat history.</span>
          </p>

          {/* Primary CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-base rounded-2xl shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-2"
            >
              <span>Start Remembering Together</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="w-full sm:w-auto px-7 py-4 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 font-semibold text-base rounded-2xl transition flex items-center justify-center space-x-2"
            >
              <span>Explore Demo Workspace</span>
            </button>
          </div>

          {/* Avatar social proof */}
          <div className="mt-12 flex items-center space-x-3 text-xs text-slate-400">
            <div className="flex -space-x-2 overflow-hidden">
              <span className="inline-block h-7 w-7 rounded-full ring-2 ring-[#0B0F19] bg-gradient-to-tr from-pink-500 to-rose-400 text-[10px] font-bold text-white flex items-center justify-center">
                AK
              </span>
              <span className="inline-block h-7 w-7 rounded-full ring-2 ring-[#0B0F19] bg-gradient-to-tr from-indigo-500 to-blue-400 text-[10px] font-bold text-white flex items-center justify-center">
                SL
              </span>
              <span className="inline-block h-7 w-7 rounded-full ring-2 ring-[#0B0F19] bg-gradient-to-tr from-emerald-500 to-teal-400 text-[10px] font-bold text-white flex items-center justify-center">
                MR
              </span>
              <span className="inline-block h-7 w-7 rounded-full ring-2 ring-[#0B0F19] bg-gradient-to-tr from-amber-500 to-orange-400 text-[10px] font-bold text-white flex items-center justify-center">
                DV
              </span>
            </div>
            <span>Empowering engineering teams & AI agents across high-growth startups</span>
          </div>
        </div>

        {/* Scroll down indicator inviting users to discover more */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-1.5 text-slate-400 cursor-pointer hover:text-white transition">
          <a href="#demo" className="flex flex-col items-center group">
            <span className="text-[11px] font-medium tracking-wider uppercase text-slate-500 group-hover:text-indigo-400 transition">
              Scroll to explore
            </span>
            <ChevronDown className="h-4 w-4 animate-bounce text-indigo-400 mt-1" />
          </a>
        </div>
      </section>

      {/* HOW IT WORKS / PRODUCT PREVIEW SECTION */}
      <section id="demo" className="py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto relative">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
            How It Works in Practice
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Transient conversations become durable, authoritative answers.
          </h3>
          <p className="mt-3 text-slate-400 text-base">
            Whenever a teammate or agent asks a question, TeamBrain synthesizes past team consensus,
            rules, and decisions into clear, cited guidance.
          </p>
        </div>

        {/* Interactive Visual Dialogue Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Simulated chat timeline */}
          <div className="space-y-6 max-w-3xl mx-auto">
            {/* User turn */}
            <div className="flex items-start space-x-3 justify-end">
              <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-5 py-3.5 text-sm shadow-md max-w-md">
                “How should we handle webhook retries and authentication for the new billing provider?”
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center text-xs font-bold shrink-0">
                You
              </div>
            </div>

            {/* TeamBrain assistant turn with cited memory */}
            <div className="flex items-start space-x-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-md shadow-indigo-500/25">
                <Brain className="h-4 w-4" />
              </div>
              <div className="bg-slate-950 border border-slate-800 text-slate-200 rounded-2xl rounded-tl-sm p-5 text-sm shadow-lg max-w-xl">
                <div className="flex items-center space-x-2 mb-2.5">
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-700/50 rounded-full text-[11px] font-semibold">
                    <BookmarkCheck className="h-3 w-3 text-indigo-400" />
                    <span>Memory Verified by Team</span>
                  </span>
                  <span className="text-slate-500 text-xs">Decision #742</span>
                </div>

                <p className="leading-relaxed">
                  Per the team’s consensus in Architecture Review:
                </p>

                <ul className="mt-2.5 space-y-1.5 text-slate-300 list-disc list-inside text-xs leading-relaxed">
                  <li>Webhook endpoints must enforce <b>HMAC SHA-256</b> header signature validation.</li>
                  <li>Inbound transactions use <b>UUIDv7</b> idempotency keys stored with a 24-hour retention window.</li>
                  <li>Failed invocations trigger exponential backoff with jitter (max 5 retries).</li>
                </ul>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="italic">Origin: Architecture Working Group (Approved by Sarah Chen)</span>
                  <span className="text-indigo-400 font-medium">100% Consistent</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION (6 Cards) */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/60">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
            Platform Capabilities
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Built for engineering teams that move fast without breaking alignment.
          </h3>
          <p className="mt-3 text-slate-400 text-base">
            Everything you need to capture, curate, and query institutional knowledge effortlessly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 hover:border-indigo-500/40 hover:bg-slate-900/80 transition group">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Database className="h-5 w-5" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Persistent Team Memory</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Standard AI forgets everything when a chat session ends. TeamBrain keeps durable records
              of agreements, constraints, and architecture that live forever.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 hover:border-indigo-500/40 hover:bg-slate-900/80 transition group">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Human Review Queue</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Knowledge doesn't leak into the team brain without review. Teammates can inspect,
              propose corrections, approve, or reject facts before they become team consensus.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 hover:border-indigo-500/40 hover:bg-slate-900/80 transition group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Cpu className="h-5 w-5" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Autonomous Context Extraction</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Whenever you discuss project specs or set new rules in the chat assistant, TeamBrain
              automatically detects durable knowledge and suggests storing it in your vault.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 hover:border-indigo-500/40 hover:bg-slate-900/80 transition group">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Zap className="h-5 w-5" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Real-Time Synchronization</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              When an architect approves an update in Tokyo, developers in San Francisco receive the
              new rule in their assistant context instantly with zero manual sync.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 hover:border-indigo-500/40 hover:bg-slate-900/80 transition group">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Layers className="h-5 w-5" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Multi-Project Knowledge Fusion</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Harmonize conflicting conventions between frontend, backend, and infrastructure teams.
              TeamBrain flags contradictions and proposes unified syntheses.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 hover:border-indigo-500/40 hover:bg-slate-900/80 transition group">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Scoped Privacy & RBAC</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Keep personal scratchpads confidential in your private vault while elevating verified
              decisions to project and team-wide visibility with strict access control.
            </p>
          </div>
        </div>
      </section>

      {/* FEEDBACK & TESTIMONIALS SECTION */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/60">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
            User Feedback & Love
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Trusted by architects, engineers, and autonomous teams.
          </h3>
          <p className="mt-3 text-slate-400 text-base">
            See how engineering teams stopped losing institutional memory.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Review 1 */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition">
            <div>
              <div className="flex items-center space-x-1 text-amber-400 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                “We cut engineer onboarding friction by over 60%. Instead of seniors answering the exact
                same architecture question every sprint, new teammates query TeamBrain and get verified,
                cited team rules immediately.”
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs text-white">
                EV
              </div>
              <div>
                <h5 className="text-sm font-bold text-white">Elena Vance</h5>
                <p className="text-xs text-slate-400">Staff Platform Engineer @ HyperScale</p>
              </div>
            </div>
          </div>

          {/* Review 2 */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition">
            <div>
              <div className="flex items-center space-x-1 text-amber-400 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                “Our coding agents used to generate code that directly contradicted our security
                policies. With TeamBrain, our constraints persist across all interactions, and the
                agents actually respect them.”
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center font-bold text-xs text-white">
                MT
              </div>
              <div>
                <h5 className="text-sm font-bold text-white">Marcus Thorne</h5>
                <p className="text-xs text-slate-400">VP of Engineering @ VectorLabs</p>
              </div>
            </div>
          </div>

          {/* Review 3 */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition">
            <div>
              <div className="flex items-center space-x-1 text-amber-400 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                “The review queue and supersession tracking are absolute gold. When we deprecated a legacy
                caching rule, TeamBrain neatly updated the lineage so old patterns were cleanly replaced.”
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-xs text-white">
                SR
              </div>
              <div>
                <h5 className="text-sm font-bold text-white">Sophia Rodriguez</h5>
                <p className="text-xs text-slate-400">Principal Architect @ CloudWave</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION BANNER */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="bg-gradient-to-b from-indigo-950/60 to-slate-900 border border-indigo-500/20 rounded-3xl p-8 sm:p-14 relative overflow-hidden shadow-2xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

          <h3 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 relative z-10">
            Build your team’s shared brain today.
          </h3>
          <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto mb-8 relative z-10">
            Join hundreds of teams who never repeat the same meeting or lose an architectural decision.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/30 transition transform hover:scale-105 active:scale-95"
            >
              Create Free Account
            </button>
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 text-slate-300 hover:text-white border border-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-800 transition"
            >
              Sign In to Existing Team
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-slate-800/80 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4 text-indigo-400" />
            <span className="font-semibold text-slate-400">TeamBrain Platform</span>
            <span>&bull; &copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center space-x-6">
            <button type="button" onClick={() => openAuth('login')} className="hover:text-slate-300 transition">
              Sign In
            </button>
            <button type="button" onClick={() => openAuth('register')} className="hover:text-slate-300 transition">
              Create Account
            </button>
            <span className="text-slate-600">Privacy & Security First</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default AuthPage;
