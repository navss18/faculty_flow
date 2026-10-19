import React from 'react';
import {
  BarChart2,
  Users,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Briefcase,
  TrendingUp,
  Brain,
  Cpu
} from 'lucide-react';
import type { Profile, Task } from '../../types/database';
import { calculateFacultyWorkload } from '../../utils/workloadAnalytics';

interface WorkloadViewProps {
  facultyList: Profile[];
  tasks: Task[];
  onRequestHandover?: (targetFaculty: Profile) => void;
}

export const WorkloadView: React.FC<WorkloadViewProps> = ({
  facultyList,
  tasks,
  onRequestHandover
}) => {
  const workloads = facultyList.map((f) => calculateFacultyWorkload(f, tasks));

  return (
    <div className="space-y-4 animate-in fade-in duration-200 select-none">
      {/* 1. Header */}
      <div className="border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#5B8DEF]" />
          <h1 className="text-lg font-bold tracking-tight text-white">
            Faculty Capacity Directory & Workload Telemetry
          </h1>
        </div>
        <p className="text-xs text-zinc-400 font-mono mt-0.5">
          Standardized 40-hour institutional benchmark tracking across departmental staff.
        </p>
      </div>

      {/* 2. Faculty Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workloads.map((w) => {
          const isOverloaded = w.loadStatus === 'Overloaded';
          const isHeavy = w.loadStatus === 'Heavy';

          return (
            <div
              key={w.facultyId}
              className={`tech-panel p-4 rounded-xl space-y-3 border ${
                isOverloaded
                  ? 'border-rose-500/40 bg-rose-500/5'
                  : isHeavy
                  ? 'border-amber-500/30'
                  : 'border-zinc-800/80'
              }`}
            >
              {/* Profile Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#5B8DEF]/15 text-[#5B8DEF] border border-[#5B8DEF]/30 flex items-center justify-center font-bold text-xs shrink-0">
                    {w.facultyName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">
                      {w.facultyName}
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                      {w.designation} • {w.department}
                    </p>
                  </div>
                </div>

                <span
                  className={
                    isOverloaded
                      ? 'status-pill-rose'
                      : isHeavy
                      ? 'status-pill-amber'
                      : w.loadStatus === 'Underloaded'
                      ? 'status-pill-blue'
                      : 'status-pill-emerald'
                  }
                >
                  {w.loadStatus.toUpperCase()}
                </span>
              </div>

              {/* Weekly Capacity Meter */}
              <div className="space-y-1 pt-1 font-mono">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Weekly Allocated Hours</span>
                  <span className="text-white font-bold">
                    {w.totalActiveHours}h / 40h ({w.capacityUtilization}%)
                  </span>
                </div>
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800/60">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isOverloaded
                        ? 'bg-[#f43f5e]'
                        : isHeavy
                        ? 'bg-[#f59e0b]'
                        : 'bg-[#5B8DEF]'
                    }`}
                    style={{ width: `${Math.min(100, w.capacityUtilization)}%` }}
                  />
                </div>
              </div>

              {/* Duty Breakdown Grid */}
              <div className="grid grid-cols-5 gap-1 pt-2 border-t border-zinc-900 text-center font-mono text-[10px]">
                <div className="p-1.5 bg-black/40 rounded border border-zinc-800/60">
                  <span className="block text-[8px] uppercase text-zinc-500">Teaching</span>
                  <span className="font-bold text-[#5B8DEF] block">{w.teachingHours}h</span>
                </div>
                <div className="p-1.5 bg-black/40 rounded border border-zinc-800/60">
                  <span className="block text-[8px] uppercase text-zinc-500">Research</span>
                  <span className="font-bold text-[#7C5CFC] block">{w.researchHours}h</span>
                </div>
                <div className="p-1.5 bg-black/40 rounded border border-zinc-800/60">
                  <span className="block text-[8px] uppercase text-zinc-500">Grading</span>
                  <span className="font-bold text-amber-400 block">{w.gradingHours}h</span>
                </div>
                <div className="p-1.5 bg-black/40 rounded border border-zinc-800/60">
                  <span className="block text-[8px] uppercase text-zinc-500">Meetings</span>
                  <span className="font-bold text-emerald-400 block">{w.meetingHours}h</span>
                </div>
                <div className="p-1.5 bg-black/40 rounded border border-zinc-800/60">
                  <span className="block text-[8px] uppercase text-zinc-500">Admin</span>
                  <span className="font-bold text-zinc-400 block">{w.adminHours}h</span>
                </div>
              </div>

              {/* Recommendations */}
              <div className="pt-1 space-y-1 font-sans">
                {w.recommendations.map((rec, i) => (
                  <p
                    key={i}
                    className="text-[11px] text-zinc-300 bg-black/40 p-2 rounded border border-zinc-800/60"
                  >
                    {rec}
                  </p>
                ))}
              </div>

              {onRequestHandover && (
                <div className="pt-1 border-t border-zinc-900 flex justify-end">
                  <button
                    onClick={() => {
                      const profile = facultyList.find((f) => f.id === w.facultyId);
                      if (profile) onRequestHandover(profile);
                    }}
                    className="text-xs text-[#5B8DEF] hover:underline font-mono"
                  >
                    REQUEST_COVERAGE_HANDOVER →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
