import React from 'react';
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Brain,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import type { Task, Subject, SyllabusTopic, AcademicEvent, Profile } from '../../types/database';
import { calculateFacultyWorkload, calculateSyllabusMetrics } from '../../utils/workloadAnalytics';
import { formatIndianDate, formatDateRange } from '../../utils/dateUtils';
import { NavTab } from '../Layout/Sidebar';

interface DashboardViewProps {
  tasks: Task[];
  subjects: Subject[];
  topics: SyllabusTopic[];
  events: AcademicEvent[];
  currentProfile: Profile | null;
  onNavigate: (tab: NavTab) => void;
  onToggleTaskComplete: (task: Task) => void;
  onOpenNewTask: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  subjects,
  topics,
  events,
  currentProfile,
  onNavigate,
  onToggleTaskComplete,
  onOpenNewTask
}) => {
  const profileToEvaluate = currentProfile || {
    id: 'demo-faculty-01',
    email: 'faculty@university.edu',
    full_name: 'Dr. Priya Sharma',
    department: 'Computer Science',
    designation: 'Associate Professor',
    role: 'faculty'
  };

  const workloadStats = calculateFacultyWorkload(profileToEvaluate, tasks);

  // Filter pending / upcoming tasks sorted by due date
  const pendingTasks = tasks.filter((t) => t.status !== 'Completed');
  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'Completed' || !t.due_date) return false;
    return t.due_date < new Date().toISOString().split('T')[0];
  });

  const sortedUpcoming = [...pendingTasks].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });

  // Calculate overall syllabus percentage
  const totalTopicsCount = topics.length;
  const completedTopicsCount = topics.filter((t) => t.status === 'Completed').length;
  const overallSyllabusPercent =
    totalTopicsCount > 0 ? Math.round((completedTopicsCount / totalTopicsCount) * 100) : 0;

  // Category breakdown data
  const categories: Array<{
    name: Task['category'];
    hours: number;
    color: string;
    bgColor: string;
  }> = [
    { name: 'Teaching', hours: workloadStats.teachingHours, color: '#1D4ED8', bgColor: '#EFF6FF' },
    { name: 'Research', hours: workloadStats.researchHours, color: '#4338CA', bgColor: '#EEF2FF' },
    { name: 'Grading', hours: workloadStats.gradingHours, color: '#B45309', bgColor: '#FFFBEB' },
    { name: 'Meetings', hours: workloadStats.meetingHours, color: '#047857', bgColor: '#ECFDF5' },
    { name: 'Administrative', hours: workloadStats.adminHours, color: '#575962', bgColor: '#F4F2EC' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header Banner & Welcome */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2DFD6] pb-6">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#1D4ED8] font-semibold">
            Faculty Workstation • Term Overview
          </span>
          <h1 className="font-editorial-title text-3xl font-medium tracking-tight text-[#141517] mt-1">
            Welcome back, {profileToEvaluate.full_name}
          </h1>
          <p className="text-xs text-[#666973] mt-1 max-w-xl">
            {profileToEvaluate.department} • {profileToEvaluate.designation}. You have{' '}
            <span className="font-semibold text-[#141517]">{pendingTasks.length} active tasks</span>{' '}
            and{' '}
            <span className="font-semibold text-[#141517]">
              {workloadStats.totalActiveHours} committed weekly hours
            </span>
            .
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('tasks')}
            className="px-3.5 py-2 border border-[#E2DFD6] bg-white hover:bg-[#FAF9F5] rounded text-xs font-medium text-[#141517] transition-colors"
          >
            View Task Board
          </button>
          <button
            onClick={onOpenNewTask}
            className="px-3.5 py-2 bg-[#141517] text-white hover:bg-[#2A2B30] rounded text-xs font-medium transition-colors"
          >
            Create Task
          </button>
        </div>
      </div>

      {/* 2. Editorial KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="editorial-card p-5 rounded">
          <div className="flex items-center justify-between text-[#8D9099] mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider">Active Tasks</span>
            <Layers className="w-4 h-4 text-[#1D4ED8]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-editorial-num text-3xl font-medium text-[#141517]">
              {pendingTasks.length}
            </span>
            <span className="text-xs text-[#8D9099]">/ {tasks.length} total</span>
          </div>
          <p className="text-[11px] text-[#666973] mt-2">
            {tasks.filter((t) => t.status === 'Completed').length} completed this cycle
          </p>
        </div>

        {/* Metric 2 */}
        <div className="editorial-card p-5 rounded">
          <div className="flex items-center justify-between text-[#8D9099] mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider">Overdue Alerts</span>
            <AlertCircle className={`w-4 h-4 ${overdueTasks.length > 0 ? 'text-[#BE123C]' : 'text-[#047857]'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-editorial-num text-3xl font-medium ${
                overdueTasks.length > 0 ? 'text-[#BE123C]' : 'text-[#141517]'
              }`}
            >
              {overdueTasks.length}
            </span>
            <span className="text-xs text-[#8D9099]">past deadline</span>
          </div>
          <p className="text-[11px] text-[#666973] mt-2">
            {overdueTasks.length > 0 ? 'Needs immediate attention' : 'All deadlines on track'}
          </p>
        </div>

        {/* Metric 3 */}
        <div className="editorial-card p-5 rounded">
          <div className="flex items-center justify-between text-[#8D9099] mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider">Syllabus Completion</span>
            <BookOpen className="w-4 h-4 text-[#1D4ED8]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-editorial-num text-3xl font-medium text-[#141517]">
              {overallSyllabusPercent}%
            </span>
            <span className="text-xs text-[#8D9099]">
              ({completedTopicsCount}/{totalTopicsCount} topics)
            </span>
          </div>
          <div className="w-full bg-[#EAE7DF] h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-[#1D4ED8] h-full rounded-full transition-all duration-500"
              style={{ width: `${overallSyllabusPercent}%` }}
            />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="editorial-card p-5 rounded">
          <div className="flex items-center justify-between text-[#8D9099] mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider">Weekly Allocation</span>
            <Clock className="w-4 h-4 text-[#B45309]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-editorial-num text-3xl font-medium text-[#141517]">
              {workloadStats.totalActiveHours}h
            </span>
            <span className="text-xs text-[#8D9099]">/ 40h benchmark</span>
          </div>
          <p className="text-[11px] text-[#666973] mt-2 flex items-center gap-1">
            Status:{' '}
            <span
              className={`font-medium ${
                workloadStats.loadStatus === 'Overloaded'
                  ? 'text-[#BE123C]'
                  : workloadStats.loadStatus === 'Heavy'
                  ? 'text-[#B45309]'
                  : 'text-[#047857]'
              }`}
            >
              {workloadStats.loadStatus} ({workloadStats.capacityUtilization}%)
            </span>
          </p>
        </div>
      </div>

      {/* 3. Asymmetric Main Editorial Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 of 12 cols): Immediate Workload & Deadlines */}
        <div className="lg:col-span-7 space-y-8">
          {/* Urgent Deadlines Panel */}
          <div className="editorial-card rounded overflow-hidden">
            <div className="p-4 border-b border-[#ECEAE4] bg-[#FAF9F5]/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1D4ED8]" />
                <h3 className="font-editorial-serif text-base font-semibold text-[#141517]">
                  Upcoming Academic Deadlines & Next Deliverables
                </h3>
              </div>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs text-[#1D4ED8] hover:text-[#1E40AF] font-medium flex items-center gap-1"
              >
                <span>View All ({pendingTasks.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#ECEAE4]">
              {sortedUpcoming.slice(0, 5).map((task) => {
                const isOverdue =
                  task.due_date && task.due_date < new Date().toISOString().split('T')[0];
                return (
                  <div
                    key={task.id}
                    className="p-4 hover:bg-[#FCFBF9] transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => onToggleTaskComplete(task)}
                        title="Mark Complete"
                        className="mt-0.5 w-4 h-4 rounded border border-[#CCC9BF] hover:border-[#1D4ED8] flex items-center justify-center transition-colors shrink-0"
                      >
                        {task.status === 'Completed' && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
                        )}
                      </button>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-[#141517] leading-tight">
                          {task.title}
                        </p>
                        <p className="text-[11px] text-[#666973] line-clamp-1">
                          {task.description || 'No additional notes provided.'}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FAF9F5] border border-[#ECEAE4] text-[#575962]">
                            {task.category}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              task.priority === 'High'
                                ? 'bg-rose-50 border-rose-200 text-rose-700'
                                : task.priority === 'Medium'
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            {task.priority} Priority
                          </span>
                          <span className="text-[11px] text-[#8D9099] font-mono">
                            Est: {task.estimated_hours || 2}h
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[11px] font-mono font-medium block ${
                          isOverdue ? 'text-[#BE123C]' : 'text-[#575962]'
                        }`}
                      >
                        {formatIndianDate(task.due_date, 'No Date')}
                      </span>
                      {isOverdue && (
                        <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {sortedUpcoming.length === 0 && (
                <div className="p-8 text-center text-xs text-[#8D9099]">
                  No pending tasks found. All responsibilities are up to date!
                </div>
              )}
            </div>
          </div>

          {/* Academic Duty Breakdown */}
          <div className="editorial-card p-6 rounded space-y-4">
            <div className="flex items-center justify-between border-b border-[#ECEAE4] pb-3">
              <div>
                <h3 className="font-editorial-serif text-base font-semibold text-[#141517]">
                  Academic Workload Breakdown
                </h3>
                <p className="text-xs text-[#666973]">
                  Hours committed across core institutional responsibilities
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-[#141517]">
                Total: {workloadStats.totalActiveHours} Hours
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {categories.map((cat) => {
                const percent =
                  workloadStats.totalActiveHours > 0
                    ? Math.round((cat.hours / workloadStats.totalActiveHours) * 100)
                    : 0;
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#141517]">{cat.name}</span>
                      <span className="font-mono text-[#666973]">
                        {cat.hours}h ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#EAE7DF] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (5 of 12 cols): Deterministic Intelligence & Academic Calendar */}
        <div className="lg:col-span-5 space-y-8">
          {/* Workload Recommendation Box (Zero-Cost Deterministic Engine) */}
          <div className="editorial-card p-5 rounded border-l-4 border-l-[#1D4ED8] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#1D4ED8]" />
                <h4 className="font-editorial-serif text-sm font-semibold text-[#141517]">
                  Workload Health & Recommendations
                </h4>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FAF9F5] border border-[#ECEAE4] text-[#666973]">
                Deterministic • ₹0
              </span>
            </div>

            <p className="text-xs text-[#575962] leading-relaxed">
              Based on active course commitments, upcoming grading deadlines, and institutional benchmarks:
            </p>

            <div className="space-y-2 pt-1">
              {workloadStats.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded bg-[#FAF9F5] border border-[#ECEAE4] text-xs text-[#383A42] flex items-start gap-2"
                >
                  <span className="text-[#1D4ED8] font-bold text-xs mt-0.5">•</span>
                  <span className="leading-snug">{rec}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#ECEAE4] flex items-center justify-between text-[11px]">
              <span className="text-[#666973]">Department Fairness Score</span>
              <button
                onClick={() => onNavigate('fairness')}
                className="text-[#1D4ED8] hover:underline font-medium"
              >
                Inspect Distribution →
              </button>
            </div>
          </div>

          {/* Academic Calendar Events Widget */}
          <div className="editorial-card rounded overflow-hidden">
            <div className="p-4 border-b border-[#ECEAE4] bg-[#FAF9F5]/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1D4ED8]" />
                <h4 className="font-editorial-serif text-sm font-semibold text-[#141517]">
                  Academic Calendar & Key Dates
                </h4>
              </div>
              <button
                onClick={() => onNavigate('calendar')}
                className="text-xs text-[#1D4ED8] hover:text-[#1E40AF] font-medium"
              >
                Full Calendar
              </button>
            </div>

            <div className="divide-y divide-[#ECEAE4]">
              {events.slice(0, 3).map((ev) => (
                <div key={ev.id} className="p-3.5 hover:bg-[#FCFBF9] transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#141517]">{ev.title}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
                        ev.event_type === 'Exam'
                          ? 'bg-rose-100 text-rose-800'
                          : ev.event_type === 'Meeting'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {ev.event_type}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#666973] line-clamp-1">{ev.description}</p>
                  <p className="text-[10px] font-mono text-[#8D9099] mt-1">
                    {formatDateRange(ev.start_date, ev.end_date, 'Date TBA')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Subject Syllabus Trackers */}
          <div className="editorial-card p-5 rounded space-y-4">
            <div className="flex items-center justify-between border-b border-[#ECEAE4] pb-2">
              <h4 className="font-editorial-serif text-sm font-semibold text-[#141517]">
                Active Subject Syllabus
              </h4>
              <button
                onClick={() => onNavigate('syllabus')}
                className="text-xs text-[#1D4ED8] hover:text-[#1E40AF] font-medium"
              >
                Manage Modules
              </button>
            </div>

            <div className="space-y-3">
              {subjects.slice(0, 2).map((sub) => {
                const subTopics = topics.filter((t) => t.module_id.startsWith('mod-'));
                const metrics = calculateSyllabusMetrics(sub, subTopics);
                return (
                  <div key={sub.id} className="p-3 rounded bg-[#FAF9F5] border border-[#ECEAE4]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#141517]">
                        {sub.code}: {sub.name}
                      </span>
                      <span className="text-xs font-mono font-medium text-[#1D4ED8]">
                        {metrics.completionPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-[#EAE7DF] h-1.5 rounded-full overflow-hidden my-2">
                      <div
                        className="bg-[#1D4ED8] h-full rounded-full transition-all duration-300"
                        style={{ width: `${metrics.completionPercentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#666973] font-mono">
                      <span>{metrics.completedTopics} of {metrics.totalTopics} topics taught</span>
                      <span>{sub.credits} Credits • Sem {sub.semester}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
