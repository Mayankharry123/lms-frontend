// Domain types — import from '@/types' or '@/types/lead', etc.

export * from './common/api.types';
export * from './auth/auth.types';
export * from './user/user.types';
export * from './user/rbac.types';
export * from './lead/lead.types';
export * from './master/master.types';
export * from './brief/brief.types';
export * from './pages';
export * from './inventory.types';
export * from './inventory/device.types';
export * from './inventory/location-filter.types';
export * from './inventory/clone-inventory.types';

// Legacy LMS scaffold types (kept for backward compatibility)
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'instructor' | 'admin';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshTokenValue: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: User;
  students: User[];
  modules: Module[];
  thumbnail?: string;
  price: number;
  duration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  content: string;
  videoUrl?: string;
  duration: number;
  order: number;
  isCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** @deprecated Use PaginatedList from common/api.types */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'master' | 'transparent' | 'priority';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  value?: string;
  onChange?: unknown;
  onBlur?: unknown;
  ref?: unknown;
  name?: string;
  min?: string | number;
  max?: string | number;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface NavigationItem {
  label: string;
  path: string;
  icon?: string;
  children?: NavigationItem[];
}

// Re-export auth types under legacy names
export type { LoginCredentials, AuthResponse } from './auth/auth.types';
