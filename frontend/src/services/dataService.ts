import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  Task,
  Subject,
  SyllabusModule,
  SyllabusTopic,
  Profile,
  FacultyCapacity,
  HandoverRequest,
  AcademicEvent,
  AppNotification,
  TaskCategory,
  TaskPriority,
  TaskStatus
} from '../types/database';

// -------------------------------------------------------------
// LOCAL DEMO SEED DATA (Used strictly when .env is unconfigured or offline fallback)
// -------------------------------------------------------------
const SEED_PROFILES: Profile[] = [
  {
    id: 'demo-faculty-01',
    email: 'priya.sharma@university.edu',
    full_name: 'Dr. Priya Sharma',
    department: 'Computer Science & Engineering',
    designation: 'Associate Professor',
    role: 'faculty',
    created_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'demo-faculty-02',
    email: 'arjun.mehta@university.edu',
    full_name: 'Prof. Arjun Mehta',
    department: 'Computer Science & Engineering',
    designation: 'Assistant Professor',
    role: 'faculty',
    created_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'demo-faculty-03',
    email: 'sunita.rao@university.edu',
    full_name: 'Dr. Sunita Rao',
    department: 'Computer Science & Engineering',
    designation: 'Professor',
    role: 'faculty',
    created_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'demo-admin-01',
    email: 'hod.cs@university.edu',
    full_name: 'Dr. Rajesh Verma (HOD)',
    department: 'Computer Science & Engineering',
    designation: 'Head of Department & Professor',
    role: 'admin',
    created_at: '2026-08-01T00:00:00Z'
  }
];

const SEED_SUBJECTS: Subject[] = [
  {
    id: 'subj-01',
    code: 'CS301',
    name: 'Operating Systems & Kernels',
    department: 'Computer Science & Engineering',
    semester: 5,
    academic_year: '2026-2027',
    credits: 4,
    total_planned_hours: 45,
    created_by: 'demo-faculty-01'
  },
  {
    id: 'subj-02',
    code: 'CS402',
    name: 'Distributed Systems & Cloud Computing',
    department: 'Computer Science & Engineering',
    semester: 7,
    academic_year: '2026-2027',
    credits: 3,
    total_planned_hours: 40,
    created_by: 'demo-faculty-01'
  },
  {
    id: 'subj-03',
    code: 'CS204',
    name: 'Design & Analysis of Algorithms',
    department: 'Computer Science & Engineering',
    semester: 4,
    academic_year: '2026-2027',
    credits: 4,
    total_planned_hours: 50,
    created_by: 'demo-faculty-02'
  }
];

const SEED_MODULES: SyllabusModule[] = [
  {
    id: 'mod-01',
    subject_id: 'subj-01',
    module_number: 1,
    title: 'Process Management & CPU Scheduling',
    description: 'Process control blocks, context switching, FCFS, Round Robin, Multi-level feedback queues',
    planned_hours: 10,
    order_index: 1
  },
  {
    id: 'mod-02',
    subject_id: 'subj-01',
    module_number: 2,
    title: 'Memory Management & Virtual Memory',
    description: 'Paging, segmentation, TLB, demand paging, page replacement algorithms',
    planned_hours: 12,
    order_index: 2
  },
  {
    id: 'mod-03',
    subject_id: 'subj-01',
    module_number: 3,
    title: 'Storage & File Systems',
    description: 'Disk scheduling, file system implementation, directory structures',
    planned_hours: 8,
    order_index: 3
  }
];

const SEED_TOPICS: SyllabusTopic[] = [
  {
    id: 'top-01',
    module_id: 'mod-01',
    topic_number: '1.1',
    title: 'Process Lifecycle & PCB Architecture',
    planned_hours: 2,
    target_date: '2026-09-05',
    status: 'Completed',
    completed_at: '2026-09-04T11:30:00Z',
    order_index: 1
  },
  {
    id: 'top-02',
    module_id: 'mod-01',
    topic_number: '1.2',
    title: 'Preemptive vs Non-Preemptive Scheduling Algorithms',
    planned_hours: 2,
    target_date: '2026-09-12',
    status: 'Completed',
    completed_at: '2026-09-11T14:00:00Z',
    order_index: 2
  },
  {
    id: 'top-03',
    module_id: 'mod-01',
    topic_number: '1.3',
    title: 'Multi-Level Feedback Queue Implementation',
    planned_hours: 3,
    target_date: '2026-09-20',
    status: 'In Progress',
    completed_at: null,
    order_index: 3
  },
  {
    id: 'top-04',
    module_id: 'mod-01',
    topic_number: '1.4',
    title: 'Inter-Process Communication & Shared Memory',
    planned_hours: 3,
    target_date: '2026-09-28',
    status: 'Pending',
    completed_at: null,
    order_index: 4
  },
  {
    id: 'top-05',
    module_id: 'mod-02',
    topic_number: '2.1',
    title: 'Address Translation & Paging Hardware',
    planned_hours: 3,
    target_date: '2026-10-10',
    status: 'Pending',
    completed_at: null,
    order_index: 5
  },
  {
    id: 'top-06',
    module_id: 'mod-02',
    topic_number: '2.2',
    title: 'Page Replacement Algorithms (LRU, Optimal)',
    planned_hours: 3,
    target_date: '2026-10-18',
    status: 'In Progress',
    completed_at: null,
    order_index: 6
  }
];

const SEED_TASKS: Task[] = [
  {
    id: 'task-01',
    title: 'Grade OS Midterm Laboratory Exams',
    description: 'Evaluate 64 student submissions for Linux kernel syscall implementation lab',
    category: 'Grading',
    priority: 'High',
    status: 'Completed',
    due_date: '2026-09-22',
    estimated_hours: 6,
    actual_hours: 7.5,
    subject_id: 'subj-01',
    created_by: 'demo-faculty-01',
    completed_at: '2026-09-21T18:00:00Z',
    created_at: '2026-09-15T09:00:00Z'
  },
  {
    id: 'task-02',
    title: 'Deliver Module 2 Lecture: Demand Paging & TLB',
    description: '3-hour theory session with live memory trace visualization demo',
    category: 'Teaching',
    priority: 'High',
    status: 'Completed',
    due_date: '2026-10-05',
    estimated_hours: 3,
    actual_hours: 3,
    subject_id: 'subj-01',
    topic_id: 'top-05',
    created_by: 'demo-faculty-01',
    completed_at: '2026-10-05T13:00:00Z',
    created_at: '2026-09-28T10:00:00Z'
  },
  {
    id: 'task-03',
    title: 'Review IEEE Transactions Manuscript on Edge AI',
    description: 'Peer review assigned by Editor-in-Chief on latency optimization in distributed IoT',
    category: 'Research',
    priority: 'Medium',
    status: 'In Progress',
    due_date: '2026-10-24',
    estimated_hours: 5,
    actual_hours: 2,
    created_by: 'demo-faculty-01',
    created_at: '2026-10-02T14:30:00Z'
  },
  {
    id: 'task-04',
    title: 'Prepare Distributed Systems Lab 3 Spec',
    description: 'Create Docker-compose template for Raft consensus protocol simulation',
    category: 'Teaching',
    priority: 'High',
    status: 'Pending',
    due_date: '2026-10-28',
    estimated_hours: 4,
    actual_hours: 0,
    subject_id: 'subj-02',
    created_by: 'demo-faculty-01',
    created_at: '2026-10-10T11:00:00Z'
  },
  {
    id: 'task-05',
    title: 'Department Curriculum Revision Committee Meeting',
    description: 'Review 2027 AI/ML specialization track and lab hardware budget approval',
    category: 'Meetings',
    priority: 'Medium',
    status: 'Pending',
    due_date: '2026-10-25',
    estimated_hours: 2.5,
    actual_hours: 0,
    created_by: 'demo-admin-01',
    created_at: '2026-10-12T09:00:00Z'
  },
  {
    id: 'task-06',
    title: 'Finalize DST Grant Proposal on Quantum Computing',
    description: 'Complete budget justifications, equipment quotes, and co-PI signatures',
    category: 'Research',
    priority: 'High',
    status: 'In Progress',
    due_date: '2026-10-31',
    estimated_hours: 12,
    actual_hours: 6,
    created_by: 'demo-faculty-01',
    created_at: '2026-10-01T08:00:00Z'
  },
  {
    id: 'task-07',
    title: 'Accreditation NBA Documentation for CS301',
    description: 'Compile course outcome attainment matrices and sample graded answer sheets',
    category: 'Administrative',
    priority: 'Low',
    status: 'Pending',
    due_date: '2026-11-05',
    estimated_hours: 4,
    actual_hours: 0,
    subject_id: 'subj-01',
    created_by: 'demo-admin-01',
    created_at: '2026-10-14T15:00:00Z'
  },
  {
    id: 'task-08',
    title: 'Algorithm Design Viva Voce Evaluation (Batch B)',
    description: 'Conduct oral exams on dynamic programming and graph traversals for 32 students',
    category: 'Grading',
    priority: 'Medium',
    status: 'Pending',
    due_date: '2026-10-29',
    estimated_hours: 4,
    actual_hours: 0,
    subject_id: 'subj-03',
    created_by: 'demo-faculty-02',
    created_at: '2026-10-15T12:00:00Z'
  },
  {
    id: 'task-09',
    title: 'Graduate Admissions Interview Panel',
    description: 'Interview shortlisted M.Tech candidates for Systems & Security research group',
    category: 'Administrative',
    priority: 'Medium',
    status: 'In Progress',
    due_date: '2026-10-26',
    estimated_hours: 3.5,
    actual_hours: 1.5,
    created_by: 'demo-admin-01',
    created_at: '2026-10-16T10:00:00Z'
  },
  {
    id: 'task-10',
    title: 'Submit Monthly Faculty Workload Ledger',
    description: 'Consolidated report of classroom hours, mentoring credits, and institutional service',
    category: 'Administrative',
    priority: 'Low',
    status: 'Completed',
    due_date: '2026-09-30',
    estimated_hours: 1,
    actual_hours: 1,
    created_by: 'demo-faculty-01',
    completed_at: '2026-09-29T16:00:00Z',
    created_at: '2026-09-25T14:00:00Z'
  }
];

const SEED_CAPACITIES: FacultyCapacity[] = [
  {
    id: 'cap-01',
    faculty_id: 'demo-faculty-01',
    max_weekly_hours: 40,
    target_teaching_hours: 16,
    target_research_hours: 14,
    target_admin_hours: 10,
    semester: 'Odd (Fall)',
    academic_year: '2026-2027'
  },
  {
    id: 'cap-02',
    faculty_id: 'demo-faculty-02',
    max_weekly_hours: 42,
    target_teaching_hours: 18,
    target_research_hours: 12,
    target_admin_hours: 12,
    semester: 'Odd (Fall)',
    academic_year: '2026-2027'
  },
  {
    id: 'cap-03',
    faculty_id: 'demo-faculty-03',
    max_weekly_hours: 38,
    target_teaching_hours: 12,
    target_research_hours: 18,
    target_admin_hours: 8,
    semester: 'Odd (Fall)',
    academic_year: '2026-2027'
  },
  {
    id: 'cap-04',
    faculty_id: 'demo-admin-01',
    max_weekly_hours: 45,
    target_teaching_hours: 8,
    target_research_hours: 12,
    target_admin_hours: 25,
    semester: 'Odd (Fall)',
    academic_year: '2026-2027'
  }
];

const SEED_HANDOVERS: HandoverRequest[] = [
  {
    id: 'ho-01',
    requester_id: 'demo-faculty-02',
    target_faculty_id: 'demo-faculty-01',
    task_id: 'task-08',
    subject_id: 'subj-03',
    reason: 'Emergency hospital visit with family; need coverage for viva assessment session',
    status: 'pending',
    created_at: '2026-10-18T08:30:00Z'
  }
];

const SEED_EVENTS: AcademicEvent[] = [
  {
    id: 'evt-01',
    title: 'Mid-Semester Examinations Commence',
    description: 'Centralized exams across all B.Tech / M.Tech departments',
    event_type: 'Exam',
    start_date: '2026-11-02',
    end_date: '2026-11-10',
    is_all_day: true
  },
  {
    id: 'evt-02',
    title: 'Diwali Institutional Recess',
    description: 'University closed for institutional festival holidays',
    event_type: 'Holiday',
    start_date: '2026-11-11',
    end_date: '2026-11-16',
    is_all_day: true
  },
  {
    id: 'evt-03',
    title: 'Internal Quality Assurance (IQAC) Audit',
    description: 'Syllabus coverage and lesson plan review by institutional committee',
    event_type: 'Meeting',
    start_date: '2026-10-27',
    end_date: '2026-10-27',
    is_all_day: false
  },
  {
    id: 'evt-04',
    title: 'End-Term Grade Submission Deadline',
    description: 'Final marks submission portal freeze for academic registrar',
    event_type: 'Submission',
    start_date: '2026-12-15',
    is_all_day: true
  }
];

const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-01',
    user_id: 'demo-faculty-01',
    title: 'Handover Request Received',
    message: 'Prof. Arjun Mehta requested coverage for Viva Voce session on Oct 29.',
    type: 'warning',
    link: 'handovers',
    is_read: false,
    created_at: '2026-10-18T08:31:00Z'
  },
  {
    id: 'notif-02',
    user_id: 'demo-faculty-01',
    title: 'Syllabus Pace Alert',
    message: 'Module 1 for CS301 is 75% completed against target date of Oct 10.',
    type: 'info',
    link: 'syllabus',
    is_read: true,
    created_at: '2026-10-16T14:00:00Z'
  },
  {
    id: 'notif-03',
    user_id: 'demo-faculty-01',
    title: 'Department Meeting Scheduled',
    message: 'Curriculum Revision Committee meeting scheduled for Oct 25 at 10:00 AM.',
    type: 'info',
    link: 'tasks',
    is_read: true,
    created_at: '2026-10-15T09:00:00Z'
  }
];

const STORAGE_PREFIX = 'ff_';

function getStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage<T>(key: string, val: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
  } catch (err) {
    console.error('Local storage write failed:', err);
  }
}

/**
 * Exact permitted categories in the Supabase PostgreSQL database:
 * 'teaching' | 'research' | 'grading' | 'meetings' | 'administrative'
 */
const DB_PERMITTED_CATEGORIES: Record<string, string> = {
  teaching: 'teaching',
  research: 'research',
  grading: 'grading',
  meetings: 'meetings',
  meeting: 'meetings',
  administrative: 'administrative',
  admin: 'administrative'
};

/**
 * Normalizes database category values to the client's TaskCategory enum:
 * 'Teaching' | 'Research' | 'Grading' | 'Meetings' | 'Administrative'
 */
function formatCategoryForClient(category: string | undefined): TaskCategory {
  if (!category) return 'Teaching';
  const key = category.toLowerCase().trim();
  switch (key) {
    case 'research':
      return 'Research';
    case 'grading':
      return 'Grading';
    case 'meetings':
    case 'meeting':
      return 'Meetings';
    case 'administrative':
    case 'admin':
      return 'Administrative';
    case 'teaching':
    default:
      return 'Teaching';
  }
}

/**
 * Exact permitted priorities in the Supabase PostgreSQL database:
 * 'low' | 'medium' | 'high'
 */
const DB_PERMITTED_PRIORITIES: Record<string, 'low' | 'medium' | 'high'> = {
  low: 'low',
  medium: 'medium',
  high: 'high'
};

/**
 * Normalizes database priority values to the client's TaskPriority enum:
 * 'Low' | 'Medium' | 'High'
 */
function formatPriorityForClient(priority: string | undefined): TaskPriority {
  if (!priority) return 'Medium';
  const key = priority.trim().toLowerCase();
  switch (key) {
    case 'high':
      return 'High';
    case 'low':
      return 'Low';
    case 'medium':
    default:
      return 'Medium';
  }
}

/**
 * Exact permitted statuses in the Supabase PostgreSQL database:
 * 'pending' | 'in_progress' | 'completed'
 */
const DB_PERMITTED_STATUSES: Record<string, 'pending' | 'in_progress' | 'completed'> = {
  pending: 'pending',
  'in progress': 'in_progress',
  in_progress: 'in_progress',
  completed: 'completed'
};

/**
 * Normalizes database status values to the client's TaskStatus enum:
 * 'Pending' | 'In Progress' | 'Completed'
 */
function formatStatusForClient(status: string | undefined): TaskStatus {
  if (!status) return 'Pending';
  const key = status.trim().toLowerCase();
  switch (key) {
    case 'in_progress':
    case 'in progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'pending':
    default:
      return 'Pending';
  }
}

/**
 * Sanitizes task payload to match the verified PostgreSQL public.tasks table schema:
 * Columns: title, description, category, priority, status, due_date, estimated_hours, created_by
 * Strips client joins, metadata, and non-existent database columns.
 */
function sanitizeTaskPayload(task: Partial<Task>, isCreate: boolean = false): Record<string, any> {
  const allowedColumns = [
    'title',
    'description',
    'category',
    'priority',
    'status',
    'due_date',
    'estimated_hours',
    'created_by'
  ];
  const clean: Record<string, any> = {};
  for (const col of allowedColumns) {
    if ((task as any)[col] !== undefined) {
      clean[col] = (task as any)[col];
    }
  }

  // Ensure submitted category matches one of the five permitted database values:
  // 'teaching', 'research', 'grading', 'meetings', 'administrative'
  if (clean.category) {
    const key = String(clean.category).toLowerCase().trim();
    clean.category = DB_PERMITTED_CATEGORIES[key] || key;
  }

  // Ensure submitted priority matches one of the three permitted database values:
  // 'low', 'medium', 'high' (trim whitespace and convert to lowercase)
  if (clean.priority !== undefined) {
    const key = String(clean.priority).trim().toLowerCase();
    if (DB_PERMITTED_PRIORITIES[key]) {
      clean.priority = DB_PERMITTED_PRIORITIES[key];
    } else {
      clean.priority = 'medium';
    }
  }

  // Ensure submitted status matches one of the three permitted database values:
  // 'pending', 'in_progress', 'completed' (trim whitespace and normalize casing)
  if (clean.status !== undefined && clean.status !== null) {
    const rawStatus = String(clean.status).trim();
    if (rawStatus === '') {
      if (isCreate) {
        clean.status = 'pending';
      } else {
        throw new Error('Invalid task status. Permitted values are Pending, In Progress, Completed.');
      }
    } else {
      const normalizedKey = rawStatus.toLowerCase().replace(/\s+/g, ' ');
      const matched =
        DB_PERMITTED_STATUSES[normalizedKey] ||
        DB_PERMITTED_STATUSES[normalizedKey.replace(/\s+/g, '_')];
      if (matched) {
        clean.status = matched;
      } else {
        throw new Error(
          `Invalid task status: "${clean.status}". Permitted values are Pending, In Progress, Completed.`
        );
      }
    }
  } else if (isCreate) {
    // If the status is missing during task creation, use 'pending'
    clean.status = 'pending';
  }

  return clean;
}

// -------------------------------------------------------------
// UNIFIED DATA SERVICE (Supabase PostgreSQL + Resilient Offline Fallback)
// -------------------------------------------------------------
export const dataService = {
  // --- TASKS ---
  async getTasks(currentUserId?: string, userRole?: string): Promise<Task[]> {
    if (isSupabaseConfigured()) {
      try {
        // Attempt full relation query with task_assignments
        let { data, error } = await supabase
          .from('tasks')
          .select(`
            *,
            subject:subjects(*),
            topic:syllabus_topics(*),
            task_assignments(faculty:profiles(*))
          `)
          .order('due_date', { ascending: true, nullsFirst: false });

        // If direct foreign keys to subjects/topics are not in schema cache, fall back cleanly
        if (error && (error.message.includes('relationship') || error.code === 'PGRST200')) {
          const fallbackRes = await supabase
            .from('tasks')
            .select(`
              *,
              task_assignments(faculty:profiles(*))
            `)
            .order('due_date', { ascending: true, nullsFirst: false });

          if (!fallbackRes.error) {
            data = fallbackRes.data;
            error = null;
          }
        }

        // If order by due_date fails, try basic select
        if (error) {
          console.warn('Supabase getTasks fallback notice:', error.message);
          const basicRes = await supabase.from('tasks').select('*');
          if (!basicRes.error) {
            data = basicRes.data;
            error = null;
          }
        }

        if (!error && data) {
          return data.map((t: any) => ({
            ...t,
            category: formatCategoryForClient(t.category),
            priority: formatPriorityForClient(t.priority),
            status: formatStatusForClient(t.status),
            assigned_faculty: t.task_assignments?.map((a: any) => a.faculty).filter(Boolean) || []
          }));
        }
      } catch (err) {
        console.warn('getTasks network/PostgREST error, using offline store:', err);
      }
    }

    // Offline / Demo store fallback
    const localTasks = getStorage<Task[]>('tasks', SEED_TASKS);
    const localSubjects = getStorage<Subject[]>('subjects', SEED_SUBJECTS);
    const localTopics = getStorage<SyllabusTopic[]>('topics', SEED_TOPICS);
    const localProfiles = getStorage<Profile[]>('profiles', SEED_PROFILES);

    return localTasks.map((t) => ({
      ...t,
      subject: localSubjects.find((s) => s.id === t.subject_id),
      topic: localTopics.find((top) => top.id === t.topic_id),
      creator: localProfiles.find((p) => p.id === t.created_by)
    }));
  },

  async createTask(taskData: Partial<Task>, assignedFacultyIds: string[] = []): Promise<Task> {
    const payload = sanitizeTaskPayload(taskData, true);

    if (isSupabaseConfigured()) {
      if (!payload.created_by) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          payload.created_by = authData.user.id;
        }
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Supabase createTask error:', error.message);
        throw new Error(`Database error: ${error.message}`);
      }

      if (assignedFacultyIds.length > 0 && data) {
        const assignments = assignedFacultyIds.map((facId) => ({
          task_id: data.id,
          faculty_id: facId
        }));
        await supabase.from('task_assignments').insert(assignments);
      }

      return {
        ...data,
        category: formatCategoryForClient(data.category),
        priority: formatPriorityForClient(data.priority),
        status: formatStatusForClient(data.status)
      } as Task;
    }

    const tasks = getStorage<Task[]>('tasks', SEED_TASKS);
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      category: taskData.category || 'Teaching',
      priority: formatPriorityForClient(taskData.priority || 'Medium'),
      status: formatStatusForClient(taskData.status || 'Pending'),
      due_date: taskData.due_date || null,
      estimated_hours: taskData.estimated_hours || 2,
      actual_hours: 0,
      created_by: taskData.created_by || 'demo-faculty-01',
      created_at: new Date().toISOString()
    };

    const updated = [newTask, ...tasks];
    setStorage('tasks', updated);
    return newTask;
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const cleanUpdates = sanitizeTaskPayload(updates, false);

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('tasks')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase updateTask error:', error.message);
        throw new Error(`Database error: ${error.message}`);
      }
      return data
        ? ({
          ...data,
          category: formatCategoryForClient(data.category),
          priority: formatPriorityForClient(data.priority),
          status: formatStatusForClient(data.status)
        } as Task)
        : null;
    }

    const tasks = getStorage<Task[]>('tasks', SEED_TASKS);
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const updatedTask = {
      ...tasks[index],
      ...updates,
      ...(updates.status !== undefined ? { status: formatStatusForClient(updates.status) } : {}),
      updated_at: new Date().toISOString()
    };
    tasks[index] = updatedTask;
    setStorage('tasks', tasks);
    return updatedTask;
  },

  async deleteTask(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) {
        console.error('Supabase deleteTask error:', error.message);
        throw new Error(`Database error: ${error.message}`);
      }
      return true;
    }

    const tasks = getStorage<Task[]>('tasks', SEED_TASKS);
    const filtered = tasks.filter((t) => t.id !== id);
    setStorage('tasks', filtered);
    return true;
  },

  // --- SUBJECTS & SYLLABUS ---
  async getSubjects(): Promise<Subject[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('subjects').select('*').order('name');
        if (!error && data) {
          return data.map((s: any) => ({
            ...s,
            code: s.subject_code || s.code || 'CS000'
          })) as Subject[];
        }
      } catch (err) {
        console.warn('getSubjects fetch error, using fallback:', err);
      }
    }
    return getStorage<Subject[]>('subjects', SEED_SUBJECTS);
  },

  async createSubject(subjectData: Partial<Subject>): Promise<Subject> {
    if (isSupabaseConfigured()) {
      const payload: Record<string, any> = {
        name: subjectData.name,
        department: subjectData.department,
        semester: subjectData.semester,
        academic_year: subjectData.academic_year,
        created_by: subjectData.created_by,
        subject_code: (subjectData as any).subject_code || subjectData.code || 'CS101'
      };
      const { data, error } = await supabase.from('subjects').insert([payload]).select().single();
      if (error) {
        console.error('Supabase createSubject error:', error.message);
        throw new Error(`Database error: ${error.message}`);
      }
      return { ...data, code: data.subject_code || data.code } as Subject;
    }
    const subjects = getStorage<Subject[]>('subjects', SEED_SUBJECTS);
    const newSubj: Subject = {
      id: `subj-${Date.now()}`,
      code: subjectData.code || 'CS000',
      name: subjectData.name || 'Untitled Subject',
      department: subjectData.department || 'Computer Science & Engineering',
      semester: subjectData.semester || 1,
      academic_year: subjectData.academic_year || '2026-2027',
      credits: subjectData.credits || 3,
      total_planned_hours: subjectData.total_planned_hours || 45,
      created_by: subjectData.created_by,
      created_at: new Date().toISOString()
    };
    setStorage('subjects', [newSubj, ...subjects]);
    return newSubj;
  },

  async getModulesForSubject(subjectId: string): Promise<SyllabusModule[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('syllabus_modules')
          .select('*')
          .eq('subject_id', subjectId);
        if (!error && data) {
          return (data as any[]).sort((a, b) => {
            const numA = a.module_number ?? a.order_index ?? 0;
            const numB = b.module_number ?? b.order_index ?? 0;
            return numA - numB;
          }) as SyllabusModule[];
        }
      } catch (err) {
        console.warn('getModulesForSubject fetch error:', err);
      }
    }
    const modules = getStorage<SyllabusModule[]>('modules', SEED_MODULES);
    return modules.filter((m) => m.subject_id === subjectId);
  },

  async getTopicsForSubject(subjectId: string): Promise<SyllabusTopic[]> {
    const modules = await this.getModulesForSubject(subjectId);
    const moduleIds = modules.map((m) => m.id);

    if (moduleIds.length === 0) return [];

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('syllabus_topics')
          .select('*')
          .in('module_id', moduleIds);
        if (!error && data) {
          return (data as any[]).sort((a, b) => {
            const ordA = a.order_index ?? a.topic_number ?? 0;
            const ordB = b.order_index ?? b.topic_number ?? 0;
            return String(ordA).localeCompare(String(ordB), undefined, { numeric: true });
          }) as SyllabusTopic[];
        }
      } catch (err) {
        console.warn('getTopicsForSubject fetch error:', err);
      }
    }
    const topics = getStorage<SyllabusTopic[]>('topics', SEED_TOPICS);
    return topics.filter((t) => moduleIds.includes(t.module_id));
  },

  async updateTopicStatus(topicId: string, status: 'Pending' | 'In Progress' | 'Completed'): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('syllabus_topics')
        .update({
          status,
          completed_at: status === 'Completed' ? new Date().toISOString() : null
        })
        .eq('id', topicId);
      if (error) {
        console.error('Supabase updateTopicStatus error:', error.message);
        throw new Error(`Database error: ${error.message}`);
      }
      return;
    }
    const topics = getStorage<SyllabusTopic[]>('topics', SEED_TOPICS);
    const updated = topics.map((top) =>
      top.id === topicId
        ? {
          ...top,
          status,
          completed_at: status === 'Completed' ? new Date().toISOString() : null
        }
        : top
    );
    setStorage('topics', updated);
  },

  // --- FACULTY DIRECTORY & CAPACITY ---
  async getFacultyProfiles(): Promise<Profile[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').order('full_name');
        if (!error && data && data.length > 0) {
          return data as Profile[];
        }
      } catch (err) {
        console.warn('getFacultyProfiles fetch error, using fallback:', err);
      }
    }
    return getStorage<Profile[]>('profiles', SEED_PROFILES);
  },

  // --- HANDOVERS ---
  async getHandovers(): Promise<HandoverRequest[]> {
    if (isSupabaseConfigured()) {
      try {
        let { data, error } = await supabase
          .from('handover_requests')
          .select(`
            *,
            requester:profiles!requested_by(*),
            target_faculty:profiles!requested_to(*),
            task:tasks(*)
          `)
          .order('created_at', { ascending: false });

        if (error && (error.message.includes('relationship') || error.code === 'PGRST200')) {
          const fallbackRes = await supabase
            .from('handover_requests')
            .select('*')
            .order('created_at', { ascending: false });
          if (!fallbackRes.error) {
            data = fallbackRes.data;
            error = null;
          }
        }

        if (!error && data) {
          return data.map((h: any) => ({
            ...h,
            requester_id: h.requested_by,
            target_faculty_id: h.requested_to
          })) as HandoverRequest[];
        }
      } catch (err) {
        console.warn('getHandovers fetch error:', err);
      }
    }

    const handovers = getStorage<HandoverRequest[]>('handovers', SEED_HANDOVERS);
    const profiles = getStorage<Profile[]>('profiles', SEED_PROFILES);
    const tasks = getStorage<Task[]>('tasks', SEED_TASKS);
    const subjects = getStorage<Subject[]>('subjects', SEED_SUBJECTS);

    return handovers.map((h) => ({
      ...h,
      requester: profiles.find((p) => p.id === h.requester_id),
      target_faculty: profiles.find((p) => p.id === h.target_faculty_id),
      task: tasks.find((t) => t.id === h.task_id),
      subject: subjects.find((s) => s.id === h.subject_id)
    }));
  },

  async createHandover(data: Partial<HandoverRequest>): Promise<HandoverRequest> {
    if (isSupabaseConfigured()) {
      const payload = {
        task_id: data.task_id,
        requested_by: (data as any).requested_by || data.requester_id,
        requested_to: (data as any).requested_to || data.target_faculty_id,
        reason: data.reason,
        status: data.status || 'pending'
      };
      const { data: created, error } = await supabase
        .from('handover_requests')
        .insert([payload])
        .select()
        .single();
      if (error) {
        console.error('Supabase createHandover error:', error.message);
        throw new Error(`Database error: ${error.message}`);
      }
      return {
        ...created,
        requester_id: created.requested_by,
        target_faculty_id: created.requested_to
      } as HandoverRequest;
    }
    const handovers = getStorage<HandoverRequest[]>('handovers', SEED_HANDOVERS);
    const newHandover: HandoverRequest = {
      id: `ho-${Date.now()}`,
      requester_id: data.requester_id || 'demo-faculty-01',
      target_faculty_id: data.target_faculty_id || 'demo-faculty-02',
      task_id: data.task_id || null,
      reason: data.reason || '',
      status: 'pending',
      created_at: new Date().toISOString()
    };
    setStorage('handovers', [newHandover, ...handovers]);
    return newHandover;
  },

  async updateHandoverStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('handover_requests')
        .update({ status })
        .eq('id', id);
      if (error) {
        console.error('Supabase updateHandoverStatus error:', error.message);
        throw new Error(`Database error: ${error.message}`);
      }
      return;
    }
    const handovers = getStorage<HandoverRequest[]>('handovers', SEED_HANDOVERS);
    const updated = handovers.map((h) =>
      h.id === id ? { ...h, status, reviewed_at: new Date().toISOString() } : h
    );
    setStorage('handovers', updated);
  },

  // --- ACADEMIC EVENTS ---
  async getAcademicEvents(): Promise<AcademicEvent[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('academic_events').select('*');
        if (!error && data) {
          return (data as any[]).map((e) => ({
            ...e,
            start_date: e.start_date || e.starts_at?.split('T')[0] || e.created_at?.split('T')[0] || '2026-09-01',
            end_date: e.end_date || e.ends_at?.split('T')[0] || null
          })).sort((a, b) => a.start_date.localeCompare(b.start_date)) as AcademicEvent[];
        }
      } catch (err) {
        console.warn('getAcademicEvents fetch error:', err);
      }
    }
    return getStorage<AcademicEvent[]>('events', SEED_EVENTS);
  },

  // --- NOTIFICATIONS ---
  async getNotifications(userId?: string): Promise<AppNotification[]> {
    if (isSupabaseConfigured() && userId) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data.map((n: any) => ({
            ...n,
            is_read: Boolean(n.read_at || n.is_read)
          })) as AppNotification[];
        }
      } catch (err) {
        console.warn('getNotifications fetch error:', err);
      }
    }
    return getStorage<AppNotification[]>('notifications', SEED_NOTIFICATIONS);
  },

  async markNotificationRead(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        console.error('Supabase markNotificationRead error:', error.message);
        throw new Error(`Database error: ${error.message}`);
      }
      return;
    }
    const notifs = getStorage<AppNotification[]>('notifications', SEED_NOTIFICATIONS);
    const updated = notifs.map((n) => (n.id === id ? { ...n, is_read: true } : n));
    setStorage('notifications', updated);
  }
};
