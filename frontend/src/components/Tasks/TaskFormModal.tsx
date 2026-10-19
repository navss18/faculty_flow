import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, BookOpen, User, AlertCircle, Terminal } from 'lucide-react';
import type { Task, Subject, SyllabusTopic, Profile, TaskCategory, TaskPriority, TaskStatus } from '../../types/database';
import { taskSchema } from '../../lib/validation';
import { formatIndianDate } from '../../utils/dateUtils';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: Partial<Task>, assignedFacultyIds: string[]) => Promise<void>;
  initialTask?: Task | null;
  subjects: Subject[];
  topics: SyllabusTopic[];
  facultyList: Profile[];
  currentUserId: string;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialTask,
  subjects,
  topics,
  facultyList,
  currentUserId
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Teaching');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [status, setStatus] = useState<TaskStatus>('Pending');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(2);
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [assignedFacultyIds, setAssignedFacultyIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setDescription(initialTask.description || '');
      setCategory(initialTask.category || 'Teaching');
      setPriority(initialTask.priority || 'Medium');
      setStatus(initialTask.status || 'Pending');
      setDueDate(initialTask.due_date || '');
      setEstimatedHours(initialTask.estimated_hours || 2);
      setSubjectId(initialTask.subject_id || '');
      setTopicId(initialTask.topic_id || '');
      setAssignedFacultyIds(initialTask.assigned_faculty?.map((f) => f.id) || []);
    } else {
      setTitle('');
      setDescription('');
      setCategory('Teaching');
      setPriority('Medium');
      setStatus('Pending');
      setDueDate('');
      setEstimatedHours(2);
      setSubjectId('');
      setTopicId('');
      setAssignedFacultyIds([]);
    }
    setErrors({});
  }, [initialTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validationResult = taskSchema.safeParse({
      title,
      description,
      category,
      priority,
      status,
      due_date: dueDate || null,
      estimated_hours: Number(estimatedHours),
      subject_id: subjectId || null,
      topic_id: topicId || null,
      assigned_faculty_ids: assignedFacultyIds
    });

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.issues.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(
        {
          title,
          description,
          category,
          priority,
          status,
          due_date: dueDate || null,
          estimated_hours: Number(estimatedHours),
          subject_id: subjectId || null,
          topic_id: topicId || null,
          created_by: initialTask ? initialTask.created_by : currentUserId
        },
        assignedFacultyIds
      );
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to persist task' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleFaculty = (id: string) => {
    setAssignedFacultyIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm select-none">
      <div className="bg-[#0c0c10] border border-zinc-800 rounded-xl max-w-xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Terminal className="w-4 h-4 text-[#5B8DEF]" />
          <h3 className="text-base font-bold text-white tracking-tight">
            {initialTask ? 'Modify Faculty Task' : 'Register Academic Task'}
          </h3>
          <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-800">
            ZOD_VALIDATED
          </span>
        </div>
        <p className="text-xs text-zinc-400 font-mono mb-4">
          Define task parameters, link curriculum modules, and allocate faculty workload.
        </p>

        {errors.form && (
          <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Title */}
          <div>
            <label className="block text-zinc-300 font-medium mb-1">
              Task Title <span className="text-[#5B8DEF]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Prepare CS301 Operating Systems Lecture on Virtual Memory"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#5B8DEF]"
            />
            {errors.title && <p className="text-[10px] font-mono text-rose-400 mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-zinc-300 font-medium mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Provide context, required student deliverables, or room details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-zinc-200 text-xs focus:outline-none focus:border-[#5B8DEF]"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-[#5B8DEF]"
              >
                <option value="Teaching">Teaching</option>
                <option value="Research">Research</option>
                <option value="Grading">Grading</option>
                <option value="Meetings">Meetings</option>
                <option value="Administrative">Administrative</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-[#5B8DEF]"
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>
            </div>
          </div>

          {/* Due Date & Estimated Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#5B8DEF]"
              />
              {dueDate && (
                <p className="text-[10px] font-mono text-[#5B8DEF] mt-1">
                  Scheduled: {formatIndianDate(dueDate)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Estimated Hours <span className="text-zinc-500 font-mono">(for workload gauge)</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="100"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#5B8DEF]"
              />
              {errors.estimated_hours && (
                <p className="text-[10px] font-mono text-rose-400 mt-1">{errors.estimated_hours}</p>
              )}
            </div>
          </div>

          {/* Link to Subject & Syllabus Topic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Link to Course / Subject
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-zinc-300 text-xs font-mono focus:outline-none focus:border-[#5B8DEF]"
              >
                <option value="">None (Independent Duty)</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code}: {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Link to Syllabus Topic
              </label>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full px-3 py-1.5 bg-black/60 border border-zinc-800 rounded-lg text-zinc-300 text-xs font-mono focus:outline-none focus:border-[#5B8DEF]"
              >
                <option value="">None</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.topic_number ? `${t.topic_number} ` : ''}{t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assign Faculty Members */}
          <div className="pt-2 border-t border-zinc-800/80">
            <label className="block text-zinc-300 font-medium mb-1.5">
              Assign Faculty Team
            </label>
            <div className="flex flex-wrap gap-1.5">
              {facultyList.map((f) => {
                const isSelected = assignedFacultyIds.includes(f.id);
                return (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => handleToggleFaculty(f.id)}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition-all border ${
                      isSelected
                        ? 'bg-[#5B8DEF] text-black border-[#5B8DEF] font-semibold'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    {f.full_name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-transparent border border-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-mono"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-[#5B8DEF] hover:bg-[#4a7de0] text-black font-semibold rounded-lg text-xs transition-all disabled:opacity-50"
            >
              {submitting ? 'COMMITTING...' : initialTask ? 'UPDATE_TASK' : 'PERSIST_TASK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
