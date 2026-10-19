import React, { useState, useMemo } from 'react';
import {
  Layers,
  AlertCircle,
  BookOpen,
  Clock,
  Search,
  CheckCircle2,
  Calendar,
  Brain,
  ChevronRight,
  Filter,
  Plus,
  ArrowUpRight,
  Sparkles,
  Activity,
  Terminal,
  Cpu
} from 'lucide-react';
import type { Task, Subject, SyllabusModule, SyllabusTopic, AcademicEvent, Profile, TaskCategory } from '../../types/database';
import { calculateFacultyWorkload, calculateSyllabusMetrics } from '../../utils/workloadAnalytics';
import { formatIndianDate, formatDateRange } from '../../utils/dateUtils';
import { NavTab } from '../Layout/Sidebar';

interface CommandCenterViewProps {
  tasks: Task[];
  subjects: Subject[];
  modules: SyllabusModule[];
  topics: SyllabusTopic[];
  events: AcademicEvent[];
  currentProfile: Profile | null;
  onNavigate: (tab: NavTab) => void;
  onToggleTaskComplete: (task: Task) => void;
  onUpdateTopicStatus: (topicId: string, status: 'Pending' | 'In Progress' | 'Completed') => void;
  onOpenNewTask: () => void;
}

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  tasks,
  subjects,
  modules,
  topics,
  events,
  currentProfile,
  onNavigate,
  onToggleTaskComplete,
  onUpdateTopicStatus,
  onOpenNewTask
}) => {
  const [taskSearch, setTaskSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');

  const profileToEvaluate = currentProfile || {
    id: 'demo-faculty-01',
    email: 'faculty@university.edu',
    full_name: 'Dr. Priya Sharma',
    department: 'Computer Science & Engineering',
    designation: 'Associate Professor',
    role: 'faculty'
  };

  const workloadStats = calculateFacultyWorkload(profileToEvaluate, tasks);
  const today = new Date().toISOString().split('T')[0];

  // Active & Overdue task filtering
  const pendingTasks = tasks.filter((t) => t.status !== 'Completed');
  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'Completed' || !t.due_date) return false;
    return t.due_date < today;
  });

  // Filter tasks for task queue
  const filteredQueue = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(taskSearch.toLowerCase()));
      const matchCat = selectedCategory === 'All' || t.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [tasks, taskSearch, selectedCategory]);

  // Active Subject & Syllabus Metrics
  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const subjectModules = modules.filter((m) => m.subject_id === activeSubject?.id);
  const subjectModuleIds = subjectModules.map((m) => m.id);
  const subjectTopics = topics.filter((t) => subjectModuleIds.includes(t.module_id));
  const syllabusMetrics = activeSubject ? calculateSyllabusMetrics(activeSubject, subjectTopics) : null;

  // Category breakdown for workload bar
  const categories: Array<{
    name: TaskCategory;
    hours: number;
    color: string;
  }> = [
    { name: 'Teaching', hours: workloadStats.teachingHours, color: '#5B8DEF' },
    { name: 'Research', hours: workloadStats.researchHours, color: '#7C5CFC' },
    { name: 'Grading', hours: workloadStats.gradingHours, color: '#F59E0B' },
    { name: 'Meetings', hours: workloadStats.meetingHours, color: '#10B981' },
    { name: 'Administrative', hours: workloadStats.adminHours, color: '#71717A' }
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-200 select-none">
      {/* 1. Technical Telemetry Gauge Strip (Top KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Gauge 1: Active Queue */}
        <div className="tech-panel p-3.5 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between text-zinc-500 font-mono text-[10px] uppercase tracking-wider mb-2">
            <span>ACTIVE_QUEUE.SYS</span>
            <span className="status-pill-blue">LIVE</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {pendingTasks.length}
            </span>
            <span className="text-[11px] font-mono text-zinc-500">/ {tasks.length} total tasks</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span>{tasks.filter((t) => t.status === 'Completed').length} resolved</span>
            <span className="text-[#5B8DEF]">{tasks.filter((t) => t.status === 'In Progress').length} in flight</span>
          </div>
        </div>

        {/* Gauge 2: Critical Alerts / Overdue */}
        <div className="tech-panel p-3.5 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between text-zinc-500 font-mono text-[10px] uppercase tracking-wider mb-2">
            <span>DEADLINE_WATCHDOG</span>
            {overdueTasks.length > 0 ? (
              <span className="status-pill-rose animate-pulse">URGENT</span>
            ) : (
              <span className="status-pill-emerald">SYNCED</span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${overdueTasks.length > 0 ? 'text-[#f43f5e]' : 'text-white'}`}>
              {overdueTasks.length}
            </span>
            <span className="text-[11px] font-mono text-zinc-500">overdue actions</span>
          </div>
          <div className="mt-2 text-[10px] font-mono text-zinc-400">
            {overdueTasks.length > 0 ? 'Requires immediate teaching allocation' : 'All course milestones within deadline'}
          </div>
        </div>

        {/* Gauge 3: Syllabus Radar */}
        <div className="tech-panel p-3.5 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between text-zinc-500 font-mono text-[10px] uppercase tracking-wider mb-2">
            <span>SYLLABUS_INDEX</span>
            <span className="status-pill-violet">CURRICULUM</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {syllabusMetrics ? syllabusMetrics.completionPercentage : 0}%
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              ({syllabusMetrics?.completedTopics || 0}/{syllabusMetrics?.totalTopics || 0} topics)
            </span>
          </div>
          <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-2.5 overflow-hidden border border-zinc-800/60">
            <div
              className="bg-gradient-to-r from-[#7C5CFC] to-[#5B8DEF] h-full rounded-full transition-all duration-300"
              style={{ width: `${syllabusMetrics ? syllabusMetrics.completionPercentage : 0}%` }}
            />
          </div>
        </div>

        {/* Gauge 4: Weekly Load Benchmark */}
        <div className="tech-panel p-3.5 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between text-zinc-500 font-mono text-[10px] uppercase tracking-wider mb-2">
            <span>CAPACITY_LOAD</span>
            <span className={
              workloadStats.loadStatus === 'Overloaded'
                ? 'status-pill-rose'
                : workloadStats.loadStatus === 'Heavy'
                ? 'status-pill-amber'
                : 'status-pill-emerald'
            }>
              {workloadStats.loadStatus.toUpperCase()}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {workloadStats.totalActiveHours}h
            </span>
            <span className="text-[11px] font-mono text-zinc-500">/ 40h standard week</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span>Utilization: {workloadStats.capacityUtilization}%</span>
            <span className="text-[#a582ff]">40h Target</span>
          </div>
        </div>
      </div>

      {/* 2. Cohesive 3-Column Command Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column (5 of 12 cols): Live Task Queue Engine */}
        <div className="lg:col-span-5 tech-panel rounded-xl overflow-hidden border border-zinc-800/80 flex flex-col h-[560px]">
          {/* Header & Category Filters */}
          <div className="p-3 bg-[#08080c] border-b border-zinc-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[#5B8DEF]" />
                <span className="text-xs font-bold text-white tracking-tight">Task Queue</span>
                <span className="text-[9px] font-mono text-zinc-500 px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800">
                  {filteredQueue.length} ITEMS
                </span>
              </div>
              <button
                onClick={onOpenNewTask}
                className="text-[10px] font-mono text-[#5B8DEF] hover:text-white flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>ADD_TASK</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Filter tasks by keyword or topic..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1 bg-black/60 border border-zinc-800 rounded-md text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#5B8DEF]"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1">
              {['All', 'Teaching', 'Research', 'Grading', 'Meetings', 'Administrative'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#5B8DEF]/20 text-[#5B8DEF] border border-[#5B8DEF]/40 font-semibold'
                      : 'bg-zinc-900/60 text-zinc-500 hover:text-zinc-300 border border-zinc-800/60'
                  }`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Tasks Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/80 p-2 space-y-1.5">
            {filteredQueue.map((task) => {
              const isOverdue = task.status !== 'Completed' && task.due_date && task.due_date < today;
              const isDone = task.status === 'Completed';

              return (
                <div
                  key={task.id}
                  className={`p-2.5 rounded-lg border transition-all ${
                    isDone
                      ? 'bg-black/30 border-zinc-900 opacity-60'
                      : 'bg-[#09090b]/80 border-zinc-800/60 hover:border-zinc-700/80 hover:bg-[#0c0c10]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <button
                        onClick={() => onToggleTaskComplete(task)}
                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                          isDone
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : 'border-zinc-700 hover:border-[#5B8DEF]'
                        }`}
                        aria-label="Toggle task completion"
                      >
                        {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>

                      <div className="min-w-0">
                        <p
                          className={`text-xs font-medium leading-tight truncate ${
                            isDone ? 'line-through text-zinc-500' : 'text-zinc-200'
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-[9px] font-mono">
                          <span className="text-zinc-500 uppercase px-1 py-0.2 rounded bg-zinc-900 border border-zinc-800/80">
                            {task.category}
                          </span>
                          <span
                            className={`px-1 py-0.2 rounded border uppercase ${
                              task.priority === 'High'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : task.priority === 'Medium'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {task.priority}
                          </span>
                          {task.estimated_hours && (
                            <span className="text-zinc-500 font-mono">{task.estimated_hours}h</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                        <span
                          className={`text-[10px] font-mono block ${
                            isOverdue ? 'text-rose-400 font-bold' : 'text-zinc-400'
                          }`}
                        >
                          {formatIndianDate(task.due_date, 'No Date')}
                        </span>
                      {isOverdue && (
                        <span className="text-[8px] font-mono uppercase tracking-wider text-rose-400 bg-rose-500/10 px-1 py-0.2 rounded">
                          OVERDUE
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredQueue.length === 0 && (
              <div className="text-center py-12 text-zinc-600 font-mono text-xs">
                NO_TASKS_MATCHED_CRITERIA
              </div>
            )}
          </div>
        </div>

        {/* Center Column (4 of 12 cols): Curriculum Syllabus Radar */}
        <div className="lg:col-span-4 tech-panel rounded-xl overflow-hidden border border-zinc-800/80 flex flex-col h-[560px]">
          {/* Header & Course Selector */}
          <div className="p-3 bg-[#08080c] border-b border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-[#7C5CFC]" />
                <span className="text-xs font-bold text-white tracking-tight">Syllabus Engine</span>
              </div>
              <button
                onClick={() => onNavigate('syllabus')}
                className="text-[10px] font-mono text-[#7C5CFC] hover:text-white flex items-center gap-0.5 transition-colors"
              >
                <span>ALL_UNITS</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Course Selector Dropdown */}
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-2.5 py-1 bg-black/60 border border-zinc-800 rounded-md text-xs font-mono text-zinc-200 focus:outline-none focus:border-[#7C5CFC]"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code}: {sub.name} (Sem {sub.semester})
                </option>
              ))}
            </select>
          </div>

          {/* Subject Metrics Bar */}
          {activeSubject && syllabusMetrics && (
            <div className="p-3 bg-[#09090b]/60 border-b border-zinc-900 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] block">COMPLETION</span>
                <span className="text-[#a582ff] font-bold text-sm">
                  {syllabusMetrics.completionPercentage}%
                </span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] block">TEACHING HOURS</span>
                <span className="text-white font-medium text-xs">
                  {syllabusMetrics.completedHours}h / {activeSubject.total_planned_hours}h
                </span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] block">TOPICS</span>
                <span className="text-zinc-300 text-xs">
                  {syllabusMetrics.completedTopics}/{syllabusMetrics.totalTopics}
                </span>
              </div>
            </div>
          )}

          {/* Module Topics List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {subjectModules.map((mod) => {
              const modTopics = subjectTopics.filter((t) => t.module_id === mod.id);
              const completedCount = modTopics.filter((t) => t.status === 'Completed').length;
              const modPct = modTopics.length > 0 ? Math.round((completedCount / modTopics.length) * 100) : 0;

              return (
                <div key={mod.id} className="bg-black/40 border border-zinc-800/60 rounded-lg p-2.5 space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-900">
                    <span className="font-mono text-[10px] text-[#5B8DEF] font-bold">
                      MOD {mod.module_number}: {mod.title}
                    </span>
                    <span className="font-mono text-[9px] text-zinc-500">{modPct}%</span>
                  </div>

                  <div className="space-y-1.5">
                    {modTopics.map((top) => {
                      const isOverdue = top.status !== 'Completed' && top.target_date && top.target_date < today;
                      return (
                        <div
                          key={top.id}
                          className="flex items-center justify-between gap-2 p-1.5 rounded bg-zinc-950/60 border border-zinc-900 text-xs"
                        >
                          <div className="min-w-0">
                            <span
                              className={`text-[11px] block truncate ${
                                top.status === 'Completed' ? 'line-through text-zinc-500' : 'text-zinc-300'
                              }`}
                            >
                              {top.topic_number ? `${top.topic_number} ` : ''}{top.title}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-500">
                              {top.planned_hours}h planned • Target: {formatIndianDate(top.target_date, 'No target date')}
                            </span>
                          </div>

                          <select
                            value={top.status}
                            onChange={(e) =>
                              onUpdateTopicStatus(
                                top.id,
                                e.target.value as 'Pending' | 'In Progress' | 'Completed'
                              )
                            }
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono bg-black border focus:outline-none ${
                              top.status === 'Completed'
                                ? 'text-emerald-400 border-emerald-500/40'
                                : top.status === 'In Progress'
                                ? 'text-[#5B8DEF] border-[#5B8DEF]/40'
                                : 'text-zinc-500 border-zinc-800'
                            }`}
                          >
                            <option value="Pending">PENDING</option>
                            <option value="In Progress">IN PROGRESS</option>
                            <option value="Completed">COMPLETED</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (3 of 12 cols): Telemetry Diagnostics & Events */}
        <div className="lg:col-span-3 space-y-3">
          {/* Duty Distribution Gauge */}
          <div className="tech-panel p-3 rounded-xl border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#5B8DEF]" />
                <span>Duty Allocation</span>
              </span>
              <span className="text-[#a582ff] font-bold">{workloadStats.totalActiveHours}h</span>
            </div>

            <div className="space-y-1.5 pt-1">
              {categories.map((cat) => {
                const pct =
                  workloadStats.totalActiveHours > 0
                    ? Math.round((cat.hours / workloadStats.totalActiveHours) * 100)
                    : 0;
                return (
                  <div key={cat.name} className="space-y-0.5">
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                      <span>{cat.name}</span>
                      <span>{cat.hours}h ({pct}%)</span>
                    </div>
                    <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Workload Intelligence (Deterministic ₹0 Diagnostics) */}
          <div className="tech-panel p-3 rounded-xl border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-[#7C5CFC]" />
                <span>Diagnostics</span>
              </span>
              <span className="text-[9px] font-mono text-emerald-400">DETERMINISTIC</span>
            </div>

            <div className="space-y-1.5">
              {workloadStats.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="p-2 rounded bg-black/40 border border-zinc-800/60 text-[10px] text-zinc-300 leading-snug flex items-start gap-1.5"
                >
                  <span className="text-[#5B8DEF] font-bold mt-0.5">•</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Academic Timetable */}
          <div className="tech-panel p-3 rounded-xl border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#5B8DEF]" />
                <span>Academic Timetable</span>
              </span>
              <button
                onClick={() => onNavigate('calendar')}
                className="text-[9px] font-mono text-[#5B8DEF] hover:underline"
              >
                EXPAND
              </button>
            </div>

            <div className="space-y-1.5">
              {events.slice(0, 2).map((ev) => (
                <div key={ev.id} className="p-2 rounded bg-black/40 border border-zinc-800/60 text-xs">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-white text-[11px] truncate">{ev.title}</span>
                    <span className={`text-[8px] font-mono px-1 py-0.2 rounded uppercase ${
                      ev.event_type === 'Exam'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {ev.event_type}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-400 block">
                    {formatDateRange(ev.start_date, ev.end_date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
