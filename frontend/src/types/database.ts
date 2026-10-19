export type UserRole = 'faculty' | 'admin';

export type TaskCategory = 'Teaching' | 'Research' | 'Grading' | 'Meetings' | 'Administrative';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  department?: string | null;
  designation?: string | null;
  role: UserRole;
  avatar_url?: string | null;
  phone?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FacultyCapacity {
  id: string;
  faculty_id: string;
  max_weekly_hours: number;
  target_teaching_hours: number;
  target_research_hours: number;
  target_admin_hours: number;
  semester: string;
  academic_year: string;
  created_at?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  department: string;
  semester: number;
  academic_year: string;
  credits: number;
  total_planned_hours: number;
  created_by?: string | null;
  created_at?: string;
}

export interface SyllabusModule {
  id: string;
  subject_id: string;
  module_number: number;
  title: string;
  description?: string | null;
  planned_hours: number;
  order_index: number;
  created_at?: string;
}

export interface SyllabusTopic {
  id: string;
  module_id: string;
  topic_number?: string | null;
  title: string;
  planned_hours: number;
  target_date?: string | null;
  status: TaskStatus;
  completed_at?: string | null;
  order_index: number;
  created_at?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string | null;
  estimated_hours?: number;
  actual_hours?: number;
  topic_id?: string | null;
  subject_id?: string | null;
  created_by: string;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joins / client populated fields
  creator?: Profile;
  assigned_faculty?: Profile[];
  subject?: Subject;
  topic?: SyllabusTopic;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  faculty_id: string;
  assigned_by?: string | null;
  assigned_at?: string;
  faculty?: Profile;
}

export interface TeachingProgress {
  id: string;
  topic_id: string;
  faculty_id: string;
  date_taught: string;
  hours_spent: number;
  remarks?: string | null;
  created_at?: string;
}

export interface HandoverRequest {
  id: string;
  requester_id: string;
  target_faculty_id: string;
  task_id?: string | null;
  subject_id?: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  admin_notes?: string | null;
  created_at?: string;
  requester?: Profile;
  target_faculty?: Profile;
  task?: Task;
  subject?: Subject;
}

export interface AcademicEvent {
  id: string;
  title: string;
  description?: string | null;
  event_type: 'Exam' | 'Holiday' | 'Meeting' | 'Submission' | 'Conference' | 'Workshop';
  start_date: string;
  end_date?: string | null;
  is_all_day?: boolean;
  created_by?: string | null;
  created_at?: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  link?: string | null;
  is_read: boolean;
  created_at?: string;
}
