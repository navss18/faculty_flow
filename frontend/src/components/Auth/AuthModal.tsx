import React, { useState } from 'react';
import { X, Lock, Mail, User, Shield, AlertCircle, ArrowRight, Terminal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { loginSchema, signupSchema } from '../../lib/validation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [designation, setDesignation] = useState('Assistant Professor');
  const [role, setRole] = useState<'faculty' | 'admin'>('faculty');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (mode === 'login') {
      const validation = loginSchema.safeParse({ email, password });
      if (!validation.success) {
        const errMap: Record<string, string> = {};
        validation.error.issues.forEach((err) => {
          errMap[err.path[0] as string] = err.message;
        });
        setErrors(errMap);
        return;
      }

      setLoading(true);
      const { error } = await signIn(email, password);
      setLoading(false);

      if (error) {
        setErrors({ form: error.message });
      } else {
        onSuccess();
        onClose();
      }
    } else {
      const validation = signupSchema.safeParse({
        email,
        password,
        fullName,
        department,
        designation,
        role
      });

      if (!validation.success) {
        const errMap: Record<string, string> = {};
        validation.error.issues.forEach((err) => {
          errMap[err.path[0] as string] = err.message;
        });
        setErrors(errMap);
        return;
      }

      setLoading(true);
      const { error } = await signUp(email, password, {
        fullName,
        department,
        designation,
        role
      });
      setLoading(false);

      if (error) {
        setErrors({ form: error.message });
      } else {
        onSuccess();
        onClose();
      }
    }
  };

  const handleQuickDemo = async (roleType: 'faculty' | 'admin') => {
    setLoading(true);
    await signIn(
      roleType === 'admin' ? 'hod.cs@university.edu' : 'priya.sharma@university.edu',
      'password123'
    );
    setLoading(false);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm select-none">
      <div className="bg-[#0c0c10] border border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 font-sans">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C5CFC] to-[#5B8DEF] flex items-center justify-center font-mono font-extrabold text-xs text-white">
            FF
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">
            {mode === 'login' ? 'Faculty Terminal Authentication' : 'Create Academic Credential'}
          </h3>
        </div>
        <p className="text-xs text-zinc-400 font-mono mb-4">
          {mode === 'login'
            ? 'Access your workload dashboard and syllabus schedules.'
            : 'Register with academic role assignment and Supabase RLS.'}
        </p>

        {errors.form && (
          <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Priya Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#5B8DEF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-[#5B8DEF]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Designation</label>
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
                <label className="block text-zinc-300 font-medium mb-1">Institutional Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'faculty' | 'admin')}
                  className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-[#5B8DEF]"
                >
                  <option value="faculty">Faculty Member</option>
                  <option value="admin">Admin / Head of Department (HOD)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Academic Email</label>
            <input
              type="email"
              required
              placeholder="prof.name@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#5B8DEF]"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#5B8DEF]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#5B8DEF] hover:bg-[#4a7de0] text-black font-semibold rounded-lg transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'AUTHENTICATING...' : mode === 'login' ? 'SIGN IN TO PORTAL' : 'CREATE CREDENTIAL'}
          </button>
        </form>

        {/* Quick viva demo access */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 text-center font-mono">
          <p className="text-[10px] text-zinc-500 mb-2">
            1-Click Viva Demo Mode (₹0 Tier)
          </p>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <button
              onClick={() => handleQuickDemo('faculty')}
              className="py-1.5 px-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-all"
            >
              Demo as Faculty
            </button>
            <button
              onClick={() => handleQuickDemo('admin')}
              className="py-1.5 px-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-all"
            >
              Demo as HOD / Admin
            </button>
          </div>
        </div>

        <div className="mt-3 text-center">
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setErrors({});
            }}
            className="text-xs text-[#5B8DEF] hover:underline font-mono"
          >
            {mode === 'login'
              ? "[+] Create new academic account"
              : "<- Return to sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};
