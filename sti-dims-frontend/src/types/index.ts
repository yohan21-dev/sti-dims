export type UserRole = 'admin' | 'officer' | 'viewer' | 'dept_head';
export type ViolationStatus = 'pending' | 'in_progress' | 'resolved' | 'appealed' | 'dismissed';
export type Severity = 'minor' | 'moderate' | 'major' | 'critical';
export type DeployStatus = 'pending' | 'ongoing' | 'completed' | 'cancelled';
export type FileCategory = 'incident_report' | 'written_statement' | 'photo_evidence' | 'parent_letter' | 'clearance' | 'id_photo' | 'other';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  last_login_at?: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  location?: string;
  head_user_id?: number | null;
  head_name?: string | null;
  is_active: 0 | 1;
}

export interface Student {
  id: number;
  student_number: string;
  last_name: string;
  first_name: string;
  program: string;
  section: string;
  violation_stats?: {
    total: number;
    pending: number;
    resolved: number;
  };
  files?: StudentFile[];
}

export interface ViolationType {
  id: number;
  violation_name: string;
  description?: string;
  severity: Severity;
  default_hours: number;
}

export interface Violation {
  id: number;
  student_id: number;
  violation_type_id: number;
  violation_name: string;
  severity: Severity;
  date_recorded: string;
  reported_by: number;
  officer_name: string;
  officer_notes?: string;
  status: ViolationStatus;
  offense_count: number;
  created_at: string;
  deployment_id?: number;
  department?: string;
  department_id?: number;
  department_name?: string;
  hours_required?: number;
  hours_completed?: number;
  deploy_status?: DeployStatus;
  date_assigned?: string;
  files?: StudentFile[];
}

export interface Deployment {
  id: number;
  violation_id: number;
  violation_name?: string;
  student_id?: number;
  student_name?: string;
  student_number?: string;
  student_program?: string;
  student_section?: string;
  department: string;
  department_id?: number;
  department_name?: string;
  department_code?: string;
  supervisor_name?: string;
  hours_required: number;
  hours_completed: number;
  date_assigned: string;
  date_completed?: string;
  status: DeployStatus;
  notes?: string;
  logs?: ServiceLog[];
}

export interface ServiceLog {
  id: number;
  deployment_id: number;
  log_date: string;
  time_in?: string;
  time_out?: string;
  hours_rendered: number;
  verified_by?: number;
  verified_by_name?: string;
  remarks?: string;
}

export interface StudentFile {
  id: number;
  student_id: number;
  violation_id?: number;
  file_name: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  category: FileCategory;
  created_at: string;
}

export interface DashboardStats {
  violations_this_month: number;
  pending_deployments: number;
  by_status: Array<{ status: ViolationStatus; count: number }>;
  by_severity: Array<{ severity: Severity; count: number }>;
  trend_30d: Array<{ day: string; count: number }>;
  top_types: Array<{ violation_name: string; count: number }>;
  repeat_offenders: Array<{ student_id: number; total: number }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}