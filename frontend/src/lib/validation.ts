import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid academic or institution email'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const signupSchema = z.object({
  email: z.string().email('Please enter a valid academic email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  department: z.string().min(2, 'Department is required (e.g. Computer Science)'),
  designation: z.string().min(2, 'Designation is required (e.g. Assistant Professor)'),
  role: z.enum(['faculty', 'admin']).default('faculty')
});

export const taskSchema = z.object({
  title: z.string().min(3, 'Task title must be at least 3 characters').max(150, 'Title is too long'),
  description: z.string().optional().default(''),
  category: z.enum(['Teaching', 'Research', 'Grading', 'Meetings', 'Administrative']),
  priority: z.enum(['Low', 'Medium', 'High']).default('Medium'),
  status: z.enum(['Pending', 'In Progress', 'Completed']).default('Pending'),
  due_date: z.string().optional().nullable(),
  estimated_hours: z.number().min(0.25, 'Estimated hours must be positive').max(100).default(2),
  actual_hours: z.number().min(0).max(100).default(0),
  subject_id: z.string().optional().nullable(),
  topic_id: z.string().optional().nullable(),
  assigned_faculty_ids: z.array(z.string()).default([])
});

export const subjectSchema = z.object({
  code: z.string().min(2, 'Subject code required (e.g. CS301)').max(20),
  name: z.string().min(3, 'Subject name required').max(100),
  department: z.string().min(2, 'Department required'),
  semester: z.number().min(1).max(8).default(1),
  academic_year: z.string().default('2026-2027'),
  credits: z.number().min(1).max(10).default(3),
  total_planned_hours: z.number().min(10).max(200).default(45)
});

export const syllabusTopicSchema = z.object({
  module_id: z.string().min(1, 'Module selection is required'),
  topic_number: z.string().optional().default(''),
  title: z.string().min(3, 'Topic title must be at least 3 characters'),
  planned_hours: z.number().min(0.5).max(40).default(2),
  target_date: z.string().optional().nullable(),
  status: z.enum(['Pending', 'In Progress', 'Completed']).default('Pending')
});

export const handoverRequestSchema = z.object({
  target_faculty_id: z.string().min(1, 'Target faculty must be selected'),
  task_id: z.string().optional().nullable(),
  subject_id: z.string().optional().nullable(),
  reason: z.string().min(10, 'Please state a clear academic or medical reason (min 10 characters)')
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type TaskFormData = z.infer<typeof taskSchema>;
export type SubjectFormData = z.infer<typeof subjectSchema>;
export type SyllabusTopicFormData = z.infer<typeof syllabusTopicSchema>;
export type HandoverFormData = z.infer<typeof handoverRequestSchema>;
