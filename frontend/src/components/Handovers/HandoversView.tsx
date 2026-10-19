import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Shield,
  Terminal
} from 'lucide-react';
import type { HandoverRequest, Profile, Task, Subject } from '../../types/database';
import { formatIndianDate } from '../../utils/dateUtils';
import { handoverRequestSchema } from '../../lib/validation';

interface HandoversViewProps {
  handovers: HandoverRequest[];
  facultyList: Profile[];
  tasks: Task[];
  subjects: Subject[];
  currentProfile: Profile | null;
  onCreateHandover: (data: Partial<HandoverRequest>) => Promise<void>;
  onUpdateStatus: (id: string, status: 'approved' | 'rejected', notes?: string) => Promise<void>;
}

export const HandoversView: React.FC<HandoversViewProps> = ({
  handovers,
  facultyList,
  tasks,
  subjects,
  currentProfile,
  onCreateHandover,
  onUpdateStatus
}) => {
  const [showModal, setShowModal] = useState(false);
  const [targetFacultyId, setTargetFacultyId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const isAdmin = currentProfile?.role === 'admin';

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = handoverRequestSchema.safeParse({
      target_faculty_id: targetFacultyId,
      task_id: taskId || null,
      subject_id: subjectId || null,
      reason
    });

    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        errs[err.path[0] as string] = err.message;
      });
      setErrors(errs);
      return;
    }

    await onCreateHandover({
      requester_id: currentProfile?.id || 'demo-faculty-01',
      target_faculty_id: targetFacultyId,
      task_id: taskId || null,
      subject_id: subjectId || null,
      reason,
      status: 'pending'
    });

    setTargetFacultyId('');
    setTaskId('');
    setSubjectId('');
    setReason('');
    setShowModal(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 select-none">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-[#5B8DEF]" />
            <h1 className="text-lg font-bold tracking-tight text-white">
              Handover & Coverage Flow
            </h1>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Formal delegation workflow for lectures, lab coverage, and exam grading transfer.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5B8DEF] hover:bg-[#4a7de0] text-black font-semibold rounded-lg text-xs transition-all shadow-md shadow-[#5B8DEF]/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Handover Request</span>
        </button>
      </div>

      {/* 2. Requests List */}
      <div className="space-y-3">
        {handovers.map((req) => {
          const isPending = req.status === 'pending';
          const isTargetOrAdmin =
            isAdmin || (currentProfile && currentProfile.id === req.target_faculty_id);

          return (
            <div
              key={req.id}
              className={`tech-panel p-4 rounded-xl space-y-2.5 border ${
                req.status === 'approved'
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : req.status === 'rejected'
                  ? 'border-rose-500/40 bg-rose-500/5'
                  : 'border-zinc-800/80'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-white">
                    {req.requester?.full_name || 'Faculty Member'}
                  </span>
                  <span className="text-zinc-600 font-mono">──▶</span>
                  <span className="font-semibold text-[#5B8DEF]">
                    {req.target_faculty?.full_name || 'Designated Colleague'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={
                      req.status === 'approved'
                        ? 'status-pill-emerald'
                        : req.status === 'rejected'
                        ? 'status-pill-rose'
                        : 'status-pill-amber'
                    }
                  >
                    {req.status.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {formatIndianDate(req.created_at, 'Recent')}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-0.5">
                    Responsibility Context
                  </span>
                  <p className="font-semibold text-white">
                    {req.task ? req.task.title : req.subject ? `${req.subject.code}: ${req.subject.name}` : 'General Duty Coverage'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-0.5">
                    Official Justification
                  </span>
                  <p className="text-zinc-400 italic">
                    "{req.reason}"
                  </p>
                </div>
              </div>

              {req.admin_notes && (
                <div className="p-2 bg-black/50 border border-zinc-900 rounded-lg text-[11px] text-zinc-400 font-mono">
                  <strong className="text-white">Review Notes:</strong> {req.admin_notes}
                  {req.reviewed_at && (
                    <span className="text-[10px] text-zinc-500 ml-2">
                      ({formatIndianDate(req.reviewed_at)})
                    </span>
                  )}
                </div>
              )}

              {/* Approval Actions */}
              {isPending && isTargetOrAdmin && (
                <div className="pt-2 border-t border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <input
                    type="text"
                    placeholder="Optional review remarks or instructions..."
                    value={reviewNotes[req.id] || ''}
                    onChange={(e) =>
                      setReviewNotes({ ...reviewNotes, [req.id]: e.target.value })
                    }
                    className="px-2.5 py-1 text-xs font-mono bg-black/60 border border-zinc-800 rounded-lg flex-1 text-white focus:outline-none"
                  />

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onUpdateStatus(req.id, 'rejected', reviewNotes[req.id])}
                      className="px-3 py-1 bg-transparent border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs font-mono"
                    >
                      DECLINE
                    </button>
                    <button
                      onClick={() => onUpdateStatus(req.id, 'approved', reviewNotes[req.id])}
                      className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 rounded-lg text-xs font-mono font-semibold"
                    >
                      APPROVE HANDOVER
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Handover Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="bg-[#0c0c10] border border-zinc-800 rounded-xl max-w-lg w-full p-5 shadow-2xl relative animate-in fade-in zoom-in-95 font-sans">
            <h3 className="text-base font-bold text-white mb-1">
              File Handover / Coverage Delegation
            </h3>
            <p className="text-xs text-zinc-400 font-mono mb-4">
              Designate a colleague to take over lecture hours or grading batches.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Designated Colleague <span className="text-[#5B8DEF]">*</span>
                </label>
                <select
                  required
                  value={targetFacultyId}
                  onChange={(e) => setTargetFacultyId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-md font-mono text-white text-xs focus:outline-none focus:border-[#5B8DEF]"
                >
                  <option value="">Select Colleague...</option>
                  {facultyList
                    .filter((f) => f.id !== currentProfile?.id)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.full_name} ({f.designation})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Task to Delegate (Optional)
                </label>
                <select
                  value={taskId}
                  onChange={(e) => setTaskId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-md font-mono text-white text-xs focus:outline-none focus:border-[#5B8DEF]"
                >
                  <option value="">Select Task...</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.category} - {t.estimated_hours || 2}h)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Official Academic / Medical Reason <span className="text-[#5B8DEF]">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Attending international symposium; requesting lab coverage for Section B."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-md text-white text-xs focus:outline-none focus:border-[#5B8DEF]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-zinc-800 rounded-md text-zinc-400 hover:text-white font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#5B8DEF] text-black font-semibold rounded-md hover:bg-[#4a7de0]"
                >
                  Submit Handover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
