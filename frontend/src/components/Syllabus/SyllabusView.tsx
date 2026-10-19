import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Terminal
} from 'lucide-react';
import type { Subject, SyllabusModule, SyllabusTopic } from '../../types/database';
import { calculateSyllabusMetrics } from '../../utils/workloadAnalytics';
import { formatIndianDate } from '../../utils/dateUtils';
import { subjectSchema } from '../../lib/validation';

interface SyllabusViewProps {
  subjects: Subject[];
  modules: SyllabusModule[];
  topics: SyllabusTopic[];
  onUpdateTopicStatus: (topicId: string, status: 'Pending' | 'In Progress' | 'Completed') => void;
  onCreateSubject: (subjectData: Partial<Subject>) => Promise<void>;
  onLinkTaskForTopic?: (topic: SyllabusTopic, subject: Subject) => void;
}

export const SyllabusView: React.FC<SyllabusViewProps> = ({
  subjects,
  modules,
  topics,
  onUpdateTopicStatus,
  onCreateSubject,
  onLinkTaskForTopic
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    'mod-01': true,
    'mod-02': true,
    'mod-03': true
  });
  const [showNewSubjectModal, setShowNewSubjectModal] = useState(false);

  // New Subject form state
  const [subCode, setSubCode] = useState('');
  const [subName, setSubName] = useState('');
  const [subDept, setSubDept] = useState('Computer Science & Engineering');
  const [subSem, setSubSem] = useState(5);
  const [subCredits, setSubCredits] = useState(4);
  const [subHours, setSubHours] = useState(45);
  const [subErrors, setSubErrors] = useState<Record<string, string>>({});

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const subjectModules = modules.filter((m) => m.subject_id === activeSubject?.id);
  const subjectModuleIds = subjectModules.map((m) => m.id);
  const subjectTopics = topics.filter((t) => subjectModuleIds.includes(t.module_id));

  const metrics = activeSubject ? calculateSyllabusMetrics(activeSubject, subjectTopics) : null;
  const today = new Date().toISOString().split('T')[0];

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubErrors({});

    const result = subjectSchema.safeParse({
      code: subCode,
      name: subName,
      department: subDept,
      semester: Number(subSem),
      credits: Number(subCredits),
      total_planned_hours: Number(subHours),
      academic_year: '2026-2027'
    });

    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        errs[err.path[0] as string] = err.message;
      });
      setSubErrors(errs);
      return;
    }

    await onCreateSubject({
      code: subCode,
      name: subName,
      department: subDept,
      semester: Number(subSem),
      credits: Number(subCredits),
      total_planned_hours: Number(subHours),
      academic_year: '2026-2027'
    });

    setSubCode('');
    setSubName('');
    setShowNewSubjectModal(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 select-none">
      {/* 1. Header & Subject Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#7C5CFC]" />
            <h1 className="text-lg font-bold tracking-tight text-white">
              Syllabus Architecture & Module Tracker
            </h1>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Curriculum unit breakdowns, planned lecture hours, and teaching milestone tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="px-3 py-1.5 bg-[#09090b] border border-zinc-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#7C5CFC]"
          >
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.code}: {sub.name} (Sem {sub.semester})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowNewSubjectModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7C5CFC] hover:bg-[#684be3] text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-[#7C5CFC]/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Course</span>
          </button>
        </div>
      </div>

      {activeSubject && metrics ? (
        <>
          {/* 2. Course KPI Panel */}
          <div className="tech-panel p-4 rounded-xl border border-zinc-800/80 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#5B8DEF] font-bold">
                  {activeSubject.code} • {activeSubject.department}
                </span>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  {activeSubject.name}
                </h2>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Semester {activeSubject.semester} • {activeSubject.credits} Credits • {activeSubject.total_planned_hours} Planned Hours
                </p>
              </div>

              <div className="text-right font-mono">
                <span className="text-[10px] text-zinc-500 uppercase block">Curriculum Taught</span>
                <span className="text-2xl font-bold text-[#a582ff]">
                  {metrics.completionPercentage}%
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800/80">
                <div
                  className="bg-gradient-to-r from-[#7C5CFC] to-[#5B8DEF] h-full rounded-full transition-all duration-300"
                  style={{ width: `${metrics.completionPercentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1">
                <span>
                  {metrics.completedTopics} of {metrics.totalTopics} topics taught ({metrics.completedHours}h logged)
                </span>
                <span>
                  {metrics.overdueTopicsCount > 0 ? (
                    <span className="text-rose-400 font-bold">
                      ⚠️ {metrics.overdueTopicsCount} overdue teaching milestone(s)
                    </span>
                  ) : (
                    <span className="text-emerald-400">All topics on schedule</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Modules List */}
          <div className="space-y-3">
            {subjectModules.map((mod) => {
              const modTopics = subjectTopics.filter((t) => t.module_id === mod.id);
              const completedCount = modTopics.filter((t) => t.status === 'Completed').length;
              const modPercent = modTopics.length > 0 ? Math.round((completedCount / modTopics.length) * 100) : 0;
              const isExpanded = expandedModules[mod.id] ?? true;

              return (
                <div key={mod.id} className="tech-panel rounded-xl overflow-hidden border border-zinc-800/80">
                  <div
                    onClick={() => toggleModule(mod.id)}
                    className="p-3 bg-[#08080c] border-b border-zinc-800/80 flex items-center justify-between cursor-pointer hover:bg-zinc-900/40 transition-colors font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <button className="text-zinc-500">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div>
                        <span className="text-[10px] text-[#5B8DEF] font-bold">
                          MODULE {mod.module_number}: {mod.title}
                        </span>
                        {mod.description && (
                          <p className="text-[10px] text-zinc-500 font-sans truncate">{mod.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-[10px]">
                      <span className="text-zinc-300 font-bold">{modPercent}%</span>
                      <span className="text-zinc-500 block text-[9px]">
                        {completedCount}/{modTopics.length} Topics
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="divide-y divide-zinc-900 p-2 space-y-1">
                      {modTopics.map((top) => {
                        const isOverdue =
                          top.status !== 'Completed' && top.target_date && top.target_date < today;
                        return (
                          <div
                            key={top.id}
                            className="p-2 hover:bg-black/40 rounded-lg transition-colors flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <span
                                className={`text-xs block truncate ${
                                  top.status === 'Completed' ? 'line-through text-zinc-500' : 'text-zinc-200'
                                }`}
                              >
                                {top.topic_number ? `${top.topic_number} ` : ''}{top.title}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 mt-0.5">
                                <span>Planned: {top.planned_hours}h</span>
                                <span>•</span>
                                <span className={isOverdue ? 'text-rose-400 font-bold' : ''}>
                                  Target: {formatIndianDate(top.target_date, 'No Date')}
                                </span>
                                {isOverdue && (
                                  <span className="text-[8px] uppercase tracking-wider px-1 rounded bg-rose-500/10 text-rose-400 font-bold">
                                    OVERDUE
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <select
                                value={top.status}
                                onChange={(e) =>
                                  onUpdateTopicStatus(
                                    top.id,
                                    e.target.value as 'Pending' | 'In Progress' | 'Completed'
                                  )
                                }
                                className={`px-2 py-0.5 rounded text-[10px] font-mono bg-black border focus:outline-none ${
                                  top.status === 'Completed'
                                    ? 'text-emerald-400 border-emerald-500/40'
                                    : top.status === 'In Progress'
                                    ? 'text-[#5B8DEF] border-[#5B8DEF]/40'
                                    : 'text-zinc-400 border-zinc-800'
                                }`}
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                              </select>

                              {onLinkTaskForTopic && (
                                <button
                                  onClick={() => onLinkTaskForTopic(top, activeSubject)}
                                  className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[#5B8DEF] rounded text-[10px] font-mono flex items-center gap-1"
                                  title="Create Task for this Topic"
                                >
                                  <span>Task</span>
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {/* New Course Modal */}
      {showNewSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="bg-[#0c0c10] border border-zinc-800 rounded-xl max-w-md w-full p-5 shadow-2xl relative animate-in fade-in zoom-in-95 font-sans">
            <h3 className="text-base font-bold text-white mb-1">
              Register Curriculum Course
            </h3>
            <p className="text-xs text-zinc-400 font-mono mb-4">
              Enter official course code and semester hour allocations.
            </p>

            <form onSubmit={handleCreateSubjectSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Course Code <span className="text-[#5B8DEF]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS301"
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-md font-mono text-white text-xs focus:outline-none focus:border-[#5B8DEF]"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Subject Name <span className="text-[#5B8DEF]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operating Systems"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-md text-white text-xs focus:outline-none focus:border-[#5B8DEF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Semester</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={subSem}
                    onChange={(e) => setSubSem(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-md font-mono text-white text-xs focus:outline-none focus:border-[#5B8DEF]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={subCredits}
                    onChange={(e) => setSubCredits(parseInt(e.target.value) || 3)}
                    className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-md font-mono text-white text-xs focus:outline-none focus:border-[#5B8DEF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Planned Hours (Syllabus Total)
                </label>
                <input
                  type="number"
                  min="10"
                  max="150"
                  value={subHours}
                  onChange={(e) => setSubHours(parseInt(e.target.value) || 45)}
                  className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-md font-mono text-white text-xs focus:outline-none focus:border-[#5B8DEF]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowNewSubjectModal(false)}
                  className="px-3 py-1.5 border border-zinc-800 rounded-md text-zinc-400 hover:text-white font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#5B8DEF] text-black font-semibold rounded-md hover:bg-[#4a7de0]"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
