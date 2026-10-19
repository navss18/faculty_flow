import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Database,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { loginSchema, signupSchema } from '../../lib/validation';

interface AuthScreenProps {
  onLoginSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const { signIn, signUp, enterDemoMode, isConfigured } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [designation, setDesignation] = useState('Assistant Professor');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const errMap: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        errMap[err.path[0] as string] = err.message;
      });
      setFieldErrors(errMap);
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMessage(error.message || 'Authentication failed. Please verify credentials.');
      } else {
        onLoginSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unexpected sign-in error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const validation = signupSchema.safeParse({
      email,
      password,
      fullName,
      department,
      designation,
      role: 'faculty' // STRICT: All signups are faculty
    });

    if (!validation.success) {
      const errMap: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        errMap[err.path[0] as string] = err.message;
      });
      setFieldErrors(errMap);
      return;
    }

    setLoading(true);
    try {
      const { error, needsEmailConfirmation } = await signUp(email, password, {
        fullName,
        department,
        designation
      });

      if (error) {
        setErrorMessage(error.message || 'Registration failed. Please try again.');
      } else if (needsEmailConfirmation) {
        setSuccessMessage(
          'Faculty account registered! If "Confirm email" is enabled in your Supabase project, verify your email before signing in. (Tip: In Supabase Dashboard -> Authentication -> Providers -> Email, you can toggle off "Confirm email" for instant login during testing).'
        );
        setMode('signin');
      } else {
        setSuccessMessage('Account registered successfully. Signing in...');
        onLoginSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unexpected registration error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#020205] text-zinc-200 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none font-sans">
      {/* Portfolio radial lighting glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-40"
        style={{
          background: 'radial-gradient(700px circle at 50% 30%, rgba(91, 141, 239, 0.15), transparent 75%)'
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Masthead */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7C5CFC] to-[#5B8DEF] font-mono font-extrabold text-base text-white shadow-xl shadow-[#7C5CFC]/25 mb-3">
            FF
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Faculty Flow
          </h1>
          <p className="text-xs font-mono text-zinc-400 mt-0.5 uppercase tracking-wider">
            Academic Operations & Command Center
          </p>

          {/* Connection Telemetry Badge */}
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#09090b] border border-zinc-800 text-[10px] font-mono">
            {isConfigured ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400">SUPABASE AUTH ENGINE ACTIVE</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-amber-400">OFFLINE DEMO MODE DETECTED</span>
              </>
            )}
          </div>
        </div>

        {/* Auth Box */}
        <div className="tech-panel p-6 rounded-2xl border border-zinc-800/80 shadow-2xl relative">
          {/* Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-black/60 rounded-lg border border-zinc-800/80 mb-5 font-mono text-xs">
            <button
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
                setFieldErrors({});
              }}
              className={`py-1.5 rounded-md transition-all font-semibold ${
                mode === 'signin'
                  ? 'bg-[#5B8DEF] text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              SIGN IN
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
                setFieldErrors({});
              }}
              className={`py-1.5 rounded-md transition-all font-semibold ${
                mode === 'signup'
                  ? 'bg-[#5B8DEF] text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              REGISTER
            </button>
          </div>

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{successMessage}</span>
            </div>
          )}

          {/* Forms */}
          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1 font-mono text-[11px]">
                  ACADEMIC EMAIL
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="prof.name@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#5B8DEF]"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-[10px] font-mono text-rose-400 mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1 font-mono text-[11px]">
                  PASSWORD
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#5B8DEF]"
                  />
                </div>
                {fieldErrors.password && (
                  <p className="text-[10px] font-mono text-rose-400 mt-1">{fieldErrors.password}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 mt-2 bg-[#5B8DEF] hover:bg-[#4a7de0] text-black font-semibold rounded-lg transition-all shadow-md shadow-[#5B8DEF]/20 font-mono text-xs disabled:opacity-50"
              >
                {loading ? 'VERIFYING CREDENTIALS...' : 'AUTHENTICATE SESSION'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1 font-mono text-[11px]">
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Priya Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-[#5B8DEF]"
                />
                {fieldErrors.fullName && (
                  <p className="text-[10px] font-mono text-rose-400 mt-1">{fieldErrors.fullName}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1 font-mono text-[11px]">
                    DEPARTMENT
                  </label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-[#5B8DEF]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1 font-mono text-[11px]">
                    DESIGNATION
                  </label>
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-[#5B8DEF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1 font-mono text-[11px]">
                  ACADEMIC EMAIL
                </label>
                <input
                  type="email"
                  required
                  placeholder="prof.name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#5B8DEF]"
                />
                {fieldErrors.email && (
                  <p className="text-[10px] font-mono text-rose-400 mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1 font-mono text-[11px]">
                  PASSWORD (MIN 6 CHARS)
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#5B8DEF]"
                />
                {fieldErrors.password && (
                  <p className="text-[10px] font-mono text-rose-400 mt-1">{fieldErrors.password}</p>
                )}
              </div>

              {/* Role Protection Notice */}
              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-[10px] font-mono text-zinc-400 space-y-1">
                <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PROVISIONED ROLE: FACULTY (MEMBER)</span>
                </div>
                <p className="text-zinc-500 leading-tight">
                  All accounts are strictly provisioned as Faculty. Self-promotion to Admin/HOD is blocked by PostgreSQL database triggers.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-[#5B8DEF] hover:bg-[#4a7de0] text-black font-semibold rounded-lg transition-all shadow-md shadow-[#5B8DEF]/20 font-mono text-xs disabled:opacity-50"
              >
                {loading ? 'REGISTERING ACCOUNT...' : 'PROVISION FACULTY CREDENTIAL'}
              </button>
            </form>
          )}

          {/* Offline Demo Access Button */}
          <div className="mt-5 pt-4 border-t border-zinc-800/80 text-center font-mono">
            <p className="text-[10px] text-zinc-500 mb-2">
              Viva Presentation & Pre-Config Testing:
            </p>
            <button
              onClick={() => {
                enterDemoMode();
                onLoginSuccess();
              }}
              className="w-full py-1.5 px-3 bg-[#09090b] hover:bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
            >
              <span>Explore via Demo Session</span>
              <ArrowRight className="w-3 h-3 text-[#5B8DEF]" />
            </button>
          </div>
        </div>

        {/* Security / Free Tier Footer */}
        <p className="text-center text-[10px] font-mono text-zinc-600 mt-4">
          Supabase PostgreSQL Free Tier • Zero-Cost Infrastructure (₹0)
        </p>
      </div>
    </div>
  );
};
