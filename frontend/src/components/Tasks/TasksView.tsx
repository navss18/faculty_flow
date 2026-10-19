import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  LayoutGrid,
  List as ListIcon,
  CheckCircle2,
  Trash2,
  Edit2,
  Calendar,
  Terminal
} from 'lucide-react';
import type { Task, TaskCategory, TaskPriority, TaskStatus, Subject, Profile } from '../../types/database';
import { formatIndianDate } from '../../utils/dateUtils';

interface TasksViewProps {
  tasks: Task[];
  subjects: Subject[];
  facultyList: Profile[];
  onOpenNewTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleTaskComplete: (task: Task) => void;
  onUpdateStatus: (id: string, status: TaskStatus) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  subjects,
  facultyList,
  onOpenNewTask,
  onEditTask,
  onDeleteTask,
  onToggleTaskComplete,
  onUpdateStatus
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  const categories: TaskCategory[] = ['Teaching', 'Research', 'Grading', 'Meetings', 'Administrative'];
  const priorities: TaskPriority[] = ['Low', 'Medium', 'High'];
  const statuses: TaskStatus[] = ['Pending', 'In Progress', 'Completed'];

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
      const matchesPri = selectedPriority === 'All' || t.priority === selectedPriority;
      const matchesStat = selectedStatus === 'All' || t.status === selectedStatus;
      return matchesSearch && matchesCat && matchesPri && matchesStat;
    });
  }, [tasks, searchQuery, selectedCategory, selectedPriority, selectedStatus]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4 animate-in fade-in duration-200 select-none">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#5B8DEF]" />
            <h1 className="text-lg font-bold tracking-tight text-white">
              Task Engine & Pipeline
            </h1>
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
              {filteredTasks.length} LOADED
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Full CRUD task queue with dual-view Kanban orchestration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* List vs Kanban Toggle */}
          <div className="flex items-center bg-[#09090b] p-0.5 rounded-lg border border-zinc-800">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-all ${
                viewMode === 'list' ? 'bg-[#5B8DEF] text-black font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>LIST</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-all ${
                viewMode === 'kanban' ? 'bg-[#5B8DEF] text-black font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>KANBAN</span>
            </button>
          </div>

          <button
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5B8DEF] hover:bg-[#4a7de0] text-black font-semibold rounded-lg text-xs transition-all shadow-md shadow-[#5B8DEF]/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 bg-[#09090b]/80 p-2.5 border border-zinc-800/80 rounded-xl">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-black/60 border border-zinc-800 rounded-md text-xs font-mono text-white focus:outline-none focus:border-[#5B8DEF]"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-2.5 py-1 bg-black/60 border border-zinc-800 rounded-md text-xs font-mono text-zinc-300 focus:outline-none focus:border-[#5B8DEF]"
        >
          <option value="All">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="px-2.5 py-1 bg-black/60 border border-zinc-800 rounded-md text-xs font-mono text-zinc-300 focus:outline-none focus:border-[#5B8DEF]"
        >
          <option value="All">All Priorities</option>
          {priorities.map((p) => (
            <option key={p} value={p}>
              {p} Priority
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-2.5 py-1 bg-black/60 border border-zinc-800 rounded-md text-xs font-mono text-zinc-300 focus:outline-none focus:border-[#5B8DEF]"
        >
          <option value="All">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Task Views */}
      {viewMode === 'list' ? (
        <div className="tech-panel rounded-xl overflow-hidden border border-zinc-800/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-[#08080c] border-b border-zinc-800/80 text-zinc-500 text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3">Title & Context</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Deadline</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredTasks.map((t) => {
                  const isOverdue = t.status !== 'Completed' && t.due_date && t.due_date < today;
                  const isDone = t.status === 'Completed';

                  return (
                    <tr key={t.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => onToggleTaskComplete(t)}
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                            isDone
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                              : 'border-zinc-700 hover:border-[#5B8DEF]'
                          }`}
                        >
                          {isDone && <CheckCircle2 className="w-3 h-3" />}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 max-w-md font-sans">
                        <p className={`font-semibold text-xs leading-snug ${isDone ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                          {t.title}
                        </p>
                        {t.description && (
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">{t.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[9px] font-mono text-zinc-500">
                          {t.subject && <span>Course: {t.subject.code}</span>}
                          {t.estimated_hours && <span>• {t.estimated_hours}h estimated</span>}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                          {t.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.5 rounded border ${
                            t.priority === 'High'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : t.priority === 'Medium'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] block ${isOverdue ? 'text-rose-400 font-bold' : 'text-zinc-400'}`}>
                          {formatIndianDate(t.due_date, 'None')}
                        </span>
                        {isOverdue && (
                          <span className="text-[8px] uppercase tracking-wider text-rose-400 font-bold">
                            OVERDUE
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={t.status}
                          onChange={(e) => onUpdateStatus(t.id, e.target.value as TaskStatus)}
                          className="bg-black/60 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] text-zinc-300 focus:outline-none"
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditTask(t)}
                            className="p-1 text-zinc-500 hover:text-white rounded hover:bg-zinc-800"
                            title="Edit task"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDeleteTask(t.id)}
                            className="p-1 text-zinc-500 hover:text-rose-400 rounded hover:bg-rose-500/10"
                            title="Delete task"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* KANBAN BOARD */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statuses.map((colStatus) => {
            const colTasks = filteredTasks.filter((t) => t.status === colStatus);
            return (
              <div key={colStatus} className="tech-panel rounded-xl p-3 border border-zinc-800/80 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-900 font-mono">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        colStatus === 'Completed'
                          ? 'bg-emerald-500'
                          : colStatus === 'In Progress'
                          ? 'bg-[#5B8DEF]'
                          : 'bg-amber-500'
                      }`}
                    />
                    {colStatus.toUpperCase()}
                  </h3>
                  <span className="text-[9px] text-zinc-500 bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-800">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2 min-h-[380px]">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-black/50 border border-zinc-800/80 rounded-lg p-3 space-y-2 hover:border-zinc-700 transition-all"
                    >
                      <div className="flex items-center justify-between gap-1 text-[9px] font-mono">
                        <span className="text-zinc-500 uppercase">{task.category}</span>
                        <span
                          className={`px-1 py-0.2 rounded border uppercase ${
                            task.priority === 'High'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-zinc-200 leading-snug">
                        {task.title}
                      </p>

                      <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                        <span>{formatIndianDate(task.due_date, 'No Date')}</span>
                        <span>{task.estimated_hours || 2}h</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                        <button
                          onClick={() => onEditTask(task)}
                          className="text-[#5B8DEF] hover:underline"
                        >
                          EDIT
                        </button>
                        <div className="flex items-center gap-1">
                          {colStatus !== 'Pending' && (
                            <button
                              onClick={() => onUpdateStatus(task.id, 'Pending')}
                              className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded hover:text-white"
                            >
                              ← PEND
                            </button>
                          )}
                          {colStatus !== 'In Progress' && (
                            <button
                              onClick={() => onUpdateStatus(task.id, 'In Progress')}
                              className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded hover:text-white"
                            >
                              {colStatus === 'Pending' ? 'START →' : '← IN PROG'}
                            </button>
                          )}
                          {colStatus !== 'Completed' && (
                            <button
                              onClick={() => onUpdateStatus(task.id, 'Completed')}
                              className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded font-semibold"
                            >
                              DONE ✓
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
