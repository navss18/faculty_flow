import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { SupabaseStatusBanner } from './components/Common/SupabaseStatusBanner';
import { CommandCenterView } from './components/Dashboard/CommandCenterView';
import { TasksView } from './components/Tasks/TasksView';
import { TaskFormModal } from './components/Tasks/TaskFormModal';
import { SyllabusView } from './components/Syllabus/SyllabusView';
import { WorkloadView } from './components/Workload/WorkloadView';
import { DepartmentFairnessView } from './components/Workload/DepartmentFairnessView';
import { HandoversView } from './components/Handovers/HandoversView';
import { CalendarView } from './components/Calendar/CalendarView';
import { AuthScreen } from './components/Auth/AuthScreen';
import { useAuth } from './context/AuthContext';
import { useToast } from './components/Common/Toast';
import { dataService } from './services/dataService';
import { Lock } from 'lucide-react';
import type {
  Task,
  Subject,
  SyllabusModule,
  SyllabusTopic,
  Profile,
  HandoverRequest,
  AcademicEvent,
  AppNotification,
  TaskStatus
} from './types/database';

export const App: React.FC = () => {
  const { user, profile, loading: authLoading, isConfigured, isDemoUser } = useAuth();
  const { toast } = useToast();
  const isAdmin = profile?.role === 'admin';

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [modules, setModules] = useState<SyllabusModule[]>([]);
  const [topics, setTopics] = useState<SyllabusTopic[]>([]);
  const [facultyList, setFacultyList] = useState<Profile[]>([]);
  const [handovers, setHandovers] = useState<HandoverRequest[]>([]);
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Load all initial data scoped to authenticated user and permissions
  const loadAllData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [
        loadedTasks,
        loadedSubjects,
        loadedProfiles,
        loadedHandovers,
        loadedEvents,
        loadedNotifs
      ] = await Promise.all([
        dataService.getTasks(profile?.id, profile?.role),
        dataService.getSubjects(),
        dataService.getFacultyProfiles(),
        dataService.getHandovers(),
        dataService.getAcademicEvents(),
        dataService.getNotifications(profile?.id)
      ]);

      setTasks(loadedTasks);
      setSubjects(loadedSubjects);
      setFacultyList(loadedProfiles);
      setHandovers(loadedHandovers);
      setEvents(loadedEvents);
      setNotifications(loadedNotifs);

      if (loadedSubjects.length > 0) {
        const subId = loadedSubjects[0].id;
        const [loadedModules, loadedTopics] = await Promise.all([
          dataService.getModulesForSubject(subId),
          dataService.getTopicsForSubject(subId)
        ]);
        setModules(loadedModules);
        setTopics(loadedTopics);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      toast(err.message || 'Could not refresh data. Check connection.', 'error');
    } finally {
      setLoadingData(false);
    }
  }, [profile?.id, profile?.role, toast]);

  useEffect(() => {
    if (user || isDemoUser) {
      loadAllData();
    } else {
      // Clear all state when logged out to avoid stale state persistence
      setTasks([]);
      setSubjects([]);
      setModules([]);
      setTopics([]);
      setFacultyList([]);
      setHandovers([]);
      setEvents([]);
      setNotifications([]);
    }
  }, [user, isDemoUser, loadAllData]);

  // If a non-admin is currently on the fairness tab, redirect back to dashboard
  useEffect(() => {
    if (activeTab === 'fairness' && !isAdmin) {
      setActiveTab('dashboard');
    }
  }, [activeTab, isAdmin]);

  // Task actions
  const handleCreateOrUpdateTask = async (
    taskData: Partial<Task>,
    assignedFacultyIds: string[]
  ) => {
    try {
      if (editingTask && editingTask.id) {
        const updated = await dataService.updateTask(editingTask.id, taskData);
        if (updated) {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          toast('Task parameters successfully committed to database.');
        }
      } else {
        const created = await dataService.createTask(
          { ...taskData, created_by: profile?.id },
          assignedFacultyIds
        );
        setTasks((prev) => [created, ...prev]);
        toast('New academic task queued to workload.');
      }
      setEditingTask(null);
      setIsTaskModalOpen(false);
    } catch (err: any) {
      toast(err.message || 'Failed to persist task.', 'error');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Delete this academic task from the repository?')) return;
    try {
      await dataService.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast('Task purged from repository.');
    } catch (err: any) {
      toast(err.message || 'Could not purge task.', 'error');
    }
  };

  const handleToggleTaskComplete = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      const updated = await dataService.updateTask(task.id, {
        status: nextStatus,
        completed_at: nextStatus === 'Completed' ? new Date().toISOString() : null
      });
      if (updated) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
        toast(
          nextStatus === 'Completed'
            ? 'Task completed • Workload gauge updated'
            : 'Task restored to pending queue'
        );
      }
    } catch (err: any) {
      toast(err.message || 'Could not update status.', 'error');
    }
  };

  const handleUpdateTaskStatus = async (id: string, status: TaskStatus) => {
    try {
      const updated = await dataService.updateTask(id, {
        status,
        completed_at: status === 'Completed' ? new Date().toISOString() : null
      });
      if (updated) {
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
        toast(`Task state shifted to ${status}.`);
      }
    } catch (err: any) {
      toast(err.message || 'Could not update status.', 'error');
    }
  };

  // Syllabus actions
  const handleUpdateTopicStatus = async (
    topicId: string,
    status: 'Pending' | 'In Progress' | 'Completed'
  ) => {
    try {
      await dataService.updateTopicStatus(topicId, status);
      setTopics((prev) =>
        prev.map((t) => (t.id === topicId ? { ...t, status } : t))
      );
      toast(`Topic status: ${status} • Syllabus radar recalculated`);
    } catch (err: any) {
      toast(err.message || 'Could not update topic.', 'error');
    }
  };

  const handleCreateSubject = async (subjectData: Partial<Subject>) => {
    try {
      const created = await dataService.createSubject({
        ...subjectData,
        created_by: profile?.id
      });
      setSubjects((prev) => [created, ...prev]);
      toast(`Course ${created.code} registered to curriculum.`);
    } catch (err: any) {
      toast(err.message || 'Could not register subject.', 'error');
    }
  };

  const handleLinkTaskForTopic = (topic: SyllabusTopic, subject: Subject) => {
    setEditingTask({
      id: '',
      title: `Teach ${subject.code}: ${topic.title}`,
      description: `Conduct lecture on ${topic.title}. Target planned: ${topic.planned_hours}h.`,
      category: 'Teaching',
      priority: 'High',
      status: 'Pending',
      estimated_hours: topic.planned_hours,
      subject_id: subject.id,
      topic_id: topic.id,
      created_by: profile?.id || 'faculty'
    });
    setIsTaskModalOpen(true);
  };

  // Handover actions
  const handleCreateHandover = async (data: Partial<HandoverRequest>) => {
    try {
      const created = await dataService.createHandover({
        ...data,
        requester_id: profile?.id
      });
      setHandovers((prev) => [created, ...prev]);
      toast('Handover request dispatched to department.');
    } catch (err: any) {
      toast(err.message || 'Could not submit handover.', 'error');
    }
  };

  const handleUpdateHandoverStatus = async (
    id: string,
    status: 'approved' | 'rejected',
    notes?: string
  ) => {
    try {
      await dataService.updateHandoverStatus(id, status, notes);
      setHandovers((prev) =>
        prev.map((h) => (h.id === id ? { ...h, status, admin_notes: notes } : h))
      );
      toast(`Handover ${status.toUpperCase()} • Colleague notified.`);
    } catch (err: any) {
      toast(err.message || 'Could not process handover.', 'error');
    }
  };

  // Notification actions
  const handleMarkNotificationRead = async (id: string) => {
    try {
      await dataService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err: any) {
      console.warn('Could not mark notification read:', err);
    }
  };

  const tabTitles: Record<NavTab, string> = {
    dashboard: 'Academic Command Center',
    tasks: 'Task Engine & Pipeline',
    syllabus: 'Curriculum & Syllabus Radar',
    workload: 'Faculty Capacity Telemetry',
    fairness: 'Department Workload Fairness',
    handovers: 'Coverage & Handover Flow',
    calendar: 'Institutional Calendar'
  };

  // 1. Loading State while checking Supabase persistent session from storage
  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-[#020205] flex flex-col items-center justify-center font-mono text-zinc-400 select-none">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7C5CFC] to-[#5B8DEF] flex items-center justify-center font-bold text-white mb-4 animate-pulse shadow-xl shadow-[#7C5CFC]/25">
          FF
        </div>
        <p className="text-xs tracking-widest uppercase text-white font-semibold">
          VERIFYING SECURE SESSION...
        </p>
        <p className="text-[10px] text-zinc-600 mt-1">Supabase PostgreSQL Auth • 256-Bit TLS</p>
      </div>
    );
  }

  // 2. Protected Route: If Supabase is configured and user is NOT logged in and NOT in demo mode
  if (isConfigured && !user && !isDemoUser) {
    return <AuthScreen onLoginSuccess={loadAllData} />;
  }

  // 3. Authenticated Workspace
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#020205] text-zinc-200 relative selection:bg-[#7C5CFC]/30 selection:text-white">
      {/* Background radial glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-40"
        style={{
          background: 'radial-gradient(600px circle at 50% 0%, rgba(91, 141, 239, 0.12), transparent 70%)'
        }}
      />

      {/* 1. Slim Technical Navigation Rail */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadCount={notifications.filter((n) => !n.is_read).length}
      />

      {/* 2. Main Technical Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Status Banner */}
        <SupabaseStatusBanner />

        {/* Global Compact Header */}
        <Header
          pageTitle={tabTitles[activeTab]}
          onOpenNewTask={() => {
            setEditingTask(null);
            setIsTaskModalOpen(true);
          }}
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          currentProfile={profile}
        />

        {/* Single-Screen Cohesive Workspace Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <CommandCenterView
              tasks={tasks}
              subjects={subjects}
              modules={modules}
              topics={topics}
              events={events}
              currentProfile={profile}
              onNavigate={(tab) => setActiveTab(tab)}
              onToggleTaskComplete={handleToggleTaskComplete}
              onUpdateTopicStatus={handleUpdateTopicStatus}
              onOpenNewTask={() => {
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksView
              tasks={tasks}
              subjects={subjects}
              facultyList={isAdmin ? facultyList : (profile ? [profile] : [])}
              onOpenNewTask={() => {
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
              onEditTask={(task) => {
                setEditingTask(task);
                setIsTaskModalOpen(true);
              }}
              onDeleteTask={handleDeleteTask}
              onToggleTaskComplete={handleToggleTaskComplete}
              onUpdateStatus={handleUpdateTaskStatus}
            />
          )}

          {activeTab === 'syllabus' && (
            <SyllabusView
              subjects={subjects}
              modules={modules}
              topics={topics}
              onUpdateTopicStatus={handleUpdateTopicStatus}
              onCreateSubject={handleCreateSubject}
              onLinkTaskForTopic={handleLinkTaskForTopic}
            />
          )}

          {activeTab === 'workload' && (
            <WorkloadView
              facultyList={isAdmin ? facultyList : (profile ? [profile] : [])}
              tasks={tasks}
              onRequestHandover={() => {
                setActiveTab('handovers');
              }}
            />
          )}

          {activeTab === 'fairness' && (
            isAdmin ? (
              <DepartmentFairnessView
                facultyList={facultyList}
                tasks={tasks}
                onNavigateHandovers={() => setActiveTab('handovers')}
              />
            ) : (
              <div className="tech-panel p-8 rounded-xl border border-rose-500/30 text-center space-y-3 font-mono">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Access Restricted • HOD Authorization Required
                </h2>
                <p className="text-xs text-zinc-400 max-w-md mx-auto font-sans">
                  Departmental Workload Fairness and Gini Variance analytics are strictly reserved for verified Heads of Department (HOD) and Administrators.
                </p>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="px-3 py-1.5 bg-[#5B8DEF] hover:bg-[#4a7de0] text-black font-semibold rounded-lg text-xs transition-all"
                >
                  Return to Command Grid
                </button>
              </div>
            )
          )}

          {activeTab === 'handovers' && (
            <HandoversView
              handovers={handovers}
              facultyList={facultyList}
              tasks={tasks}
              subjects={subjects}
              currentProfile={profile}
              onCreateHandover={handleCreateHandover}
              onUpdateStatus={handleUpdateHandoverStatus}
            />
          )}

          {activeTab === 'calendar' && <CalendarView events={events} />}
        </main>
      </div>

      {/* Task Modal (Create & Edit) */}
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleCreateOrUpdateTask}
        initialTask={editingTask}
        subjects={subjects}
        topics={topics}
        facultyList={isAdmin ? facultyList : (profile ? [profile] : [])}
        currentUserId={profile?.id || ''}
      />
    </div>
  );
};
