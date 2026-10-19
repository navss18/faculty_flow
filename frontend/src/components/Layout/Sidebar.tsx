import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  BarChart2,
  Scale,
  ArrowRightLeft,
  Calendar,
  LogOut,
  Shield,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavTab = 'dashboard' | 'tasks' | 'syllabus' | 'workload' | 'fairness' | 'handovers' | 'calendar';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  unreadCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { profile, signOut, switchDemoUser, isDemoUser, user } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Command Grid', icon: LayoutDashboard, tag: '01' },
    { id: 'tasks' as NavTab, label: 'Task Queue', icon: CheckSquare, tag: '02' },
    { id: 'syllabus' as NavTab, label: 'Syllabus Engine', icon: BookOpen, tag: '03' },
    { id: 'workload' as NavTab, label: 'Faculty Capacity', icon: BarChart2, tag: '04' },
    { id: 'fairness' as NavTab, label: 'Workload Fairness', icon: Scale, tag: '05', hodOnly: true },
    { id: 'handovers' as NavTab, label: 'Coverage Flow', icon: ArrowRightLeft, tag: '06' },
    { id: 'calendar' as NavTab, label: 'Academic Dates', icon: Calendar, tag: '07' }
  ];

  return (
    <aside className="w-60 h-screen bg-[#060609] border-r border-zinc-800/80 flex flex-col justify-between shrink-0 select-none z-20">
      {/* Brand & Terminal Header */}
      <div>
        <div className="p-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C5CFC] to-[#5B8DEF] flex items-center justify-center font-mono font-extrabold text-xs text-white shadow-lg shadow-[#7C5CFC]/20">
              FF
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white leading-none">
                  Faculty Flow
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#5B8DEF] animate-pulse"></span>
              </div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 mt-1">
                ACADEMIC OPS • V2.4
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Rail */}
        <div className="px-3 py-4">
          <p className="px-2 mb-2 text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-semibold">
            WORKSPACE MODULES
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isRestricted = item.hodOnly && !isAdmin;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!isRestricted) {
                      setActiveTab(item.id);
                    }
                  }}
                  disabled={isRestricted}
                  title={isRestricted ? 'HOD / Admin Authorization Required' : item.label}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isRestricted
                      ? 'text-zinc-600 opacity-50 cursor-not-allowed hover:bg-transparent'
                      : isActive
                      ? 'bg-[#0f0f15] text-white border border-[#5B8DEF]/40 shadow-sm shadow-[#5B8DEF]/10'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isRestricted ? (
                      <Lock className="w-4 h-4 text-zinc-600" />
                    ) : (
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#5B8DEF]' : 'text-zinc-500'}`} />
                    )}
                    <span className="tracking-tight">{item.label}</span>
                  </div>
                  <span className={`font-mono text-[9px] ${
                    isRestricted
                      ? 'text-zinc-700 uppercase font-bold'
                      : isActive
                      ? 'text-[#a582ff]'
                      : 'text-zinc-600'
                  }`}>
                    {isRestricted ? 'HOD' : item.tag}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Role & System Profile Panel */}
      <div className="p-3 border-t border-zinc-800/80 bg-[#040407] space-y-3">
        {/* Verified Institutional Role Badge (or Demo Switcher only in standalone demo mode) */}
        {isDemoUser && !user ? (
          <div className="p-2.5 bg-[#09090b] border border-zinc-800 rounded-lg">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Shield className="w-3 h-3 text-amber-400" /> Demo Simulator
              </span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                isAdmin
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {profile?.role || 'faculty'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
              <button
                onClick={() => switchDemoUser('faculty')}
                className={`py-1 px-1 rounded text-center transition-all ${
                  !isAdmin
                    ? 'bg-white text-black font-semibold'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                Faculty
              </button>
              <button
                onClick={() => switchDemoUser('admin')}
                className={`py-1 px-1 rounded text-center transition-all ${
                  isAdmin
                    ? 'bg-white text-black font-semibold'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                HOD / Admin
              </button>
            </div>
          </div>
        ) : (
          <div className="p-2.5 bg-[#09090b] border border-zinc-800/80 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#5B8DEF]" /> Verified Role
              </span>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold ${
                isAdmin
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {isAdmin ? 'HOD / ADMIN' : 'FACULTY'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono truncate">
              {isAdmin ? 'Departmental Authority' : 'Personal Academic Scope'}
            </p>
          </div>
        )}

        {/* User Badge */}
        <div className="flex items-center justify-between pt-1 px-1">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-[#5B8DEF]/20 text-[#5B8DEF] border border-[#5B8DEF]/30 flex items-center justify-center font-bold text-xs shrink-0">
              {profile?.full_name?.charAt(0) || 'F'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {profile?.full_name || 'Faculty Member'}
              </p>
              <p className="text-[10px] font-mono text-zinc-500 truncate leading-tight">
                {profile?.designation || 'Assistant Professor'}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            title="Sign Out"
            className="p-1.5 text-zinc-500 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
