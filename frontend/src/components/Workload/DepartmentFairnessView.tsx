import React from 'react';
import {
  Scale,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Users,
  Shield,
  ArrowRight
} from 'lucide-react';
import type { Profile, Task } from '../../types/database';
import { calculateDepartmentFairness, calculateFacultyWorkload } from '../../utils/workloadAnalytics';

interface DepartmentFairnessViewProps {
  facultyList: Profile[];
  tasks: Task[];
  onNavigateHandovers: () => void;
}

export const DepartmentFairnessView: React.FC<DepartmentFairnessViewProps> = ({
  facultyList,
  tasks,
  onNavigateHandovers
}) => {
  const report = calculateDepartmentFairness(facultyList, tasks, 'Computer Science & Engineering');
  const individualWorkloads = facultyList.map((f) => calculateFacultyWorkload(f, tasks));

  return (
    <div className="space-y-4 animate-in fade-in duration-200 select-none">
      {/* 1. Header */}
      <div className="border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-[#5B8DEF]" />
          <h1 className="text-lg font-bold tracking-tight text-white">
            Department Workload Fairness Index
          </h1>
          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
            GINI_VARIANCE
          </span>
        </div>
        <p className="text-xs text-zinc-400 font-mono mt-0.5">
          Objective statistical evaluation of academic equity across faculty teaching schedules.
        </p>
      </div>

      {/* 2. Metric Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
        <div className="tech-panel p-3.5 rounded-xl border border-zinc-800/80">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Fairness Score</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{report.fairnessScore}%</span>
            <span
              className={`text-xs font-semibold ${
                report.fairnessRating === 'Well Balanced'
                  ? 'text-emerald-400'
                  : report.fairnessRating === 'Moderate Imbalance'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              ({report.fairnessRating})
            </span>
          </div>
        </div>

        <div className="tech-panel p-3.5 rounded-xl border border-zinc-800/80">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Faculty Count</span>
          <span className="text-2xl font-bold text-white">{report.facultyCount}</span>
        </div>

        <div className="tech-panel p-3.5 rounded-xl border border-zinc-800/80">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Dept Total Hours</span>
          <span className="text-2xl font-bold text-[#5B8DEF]">{report.totalDepartmentHours}h</span>
        </div>

        <div className="tech-panel p-3.5 rounded-xl border border-zinc-800/80">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Average Load / Prof</span>
          <span className="text-2xl font-bold text-[#a582ff]">{report.averageHoursPerFaculty}h</span>
        </div>
      </div>

      {/* 3. Distribution Table */}
      <div className="tech-panel rounded-xl overflow-hidden border border-zinc-800/80">
        <div className="p-3 bg-[#08080c] border-b border-zinc-800/80 flex items-center justify-between font-mono">
          <span className="text-xs font-bold text-white">Staff Workload Breakdown</span>
          <span className="text-[10px] text-zinc-500">Benchmark: 40.0 Weekly Hours</span>
        </div>

        <div className="overflow-x-auto font-mono text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#09090b] border-b border-zinc-800/80 text-zinc-500 text-[10px] uppercase">
                <th className="py-2.5 px-3">Faculty Member</th>
                <th className="py-2.5 px-3">Designation</th>
                <th className="py-2.5 px-3 text-center">Teaching</th>
                <th className="py-2.5 px-3 text-center">Research</th>
                <th className="py-2.5 px-3 text-center">Grading</th>
                <th className="py-2.5 px-3 text-center">Admin</th>
                <th className="py-2.5 px-3 text-right">Total Hours</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {individualWorkloads.map((w) => (
                <tr key={w.facultyId} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-white font-sans">{w.facultyName}</td>
                  <td className="py-2.5 px-3 text-zinc-400 font-sans">{w.designation}</td>
                  <td className="py-2.5 px-3 text-center text-[#5B8DEF]">{w.teachingHours}h</td>
                  <td className="py-2.5 px-3 text-center text-[#7C5CFC]">{w.researchHours}h</td>
                  <td className="py-2.5 px-3 text-center text-amber-400">{w.gradingHours}h</td>
                  <td className="py-2.5 px-3 text-center text-zinc-400">{w.adminHours + w.meetingHours}h</td>
                  <td className="py-2.5 px-3 text-right font-bold text-white">{w.totalActiveHours}h</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={
                      w.loadStatus === 'Overloaded'
                        ? 'status-pill-rose'
                        : w.loadStatus === 'Heavy'
                        ? 'status-pill-amber'
                        : 'status-pill-emerald'
                    }>
                      {w.loadStatus.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Recommendation Card */}
      <div className="tech-panel p-4 rounded-xl border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#5B8DEF]" />
            <h4 className="text-xs font-bold text-white font-mono">
              HOD REBALANCING DIRECTIVE
            </h4>
          </div>
          <p className="text-xs text-zinc-300">
            {report.recommendation}
          </p>
        </div>

        <button
          onClick={onNavigateHandovers}
          className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 bg-[#5B8DEF] hover:bg-[#4a7de0] text-black font-semibold rounded-lg text-xs transition-all"
        >
          <span>Initiate Handover</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
