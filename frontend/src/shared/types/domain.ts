export type EntityId = string;
export type TaskStatus = "pending" | "in-progress" | "completed" | "given-up";
export type TaskPriority = "Low" | "Medium" | "High";
export type ProjectStatus = "active" | "completed";

export interface User {
  _id?: EntityId;
  id?: EntityId;
  email: string;
  name: string;
  dob?: string;
  nationality?: string;
  role: "USER" | "ADMIN";
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  _id: EntityId;
  name: string;
  description?: string;
}

export interface ProjectSummary {
  totalTasks: number;
  finishedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  givenUpTasks: number;
  scheduledTasks: number;
  canComplete: boolean;
  completionRate: number;
}

export interface Project {
  _id: EntityId;
  name: string;
  description: string;
  color: string;
  status: ProjectStatus;
  summary?: ProjectSummary;
}

export interface ProjectWithSummary extends Project {
  summary: ProjectSummary;
}

export interface Task {
  _id: EntityId;
  id?: EntityId;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  categoryId: EntityId | Category | null;
  projectId: EntityId | Project | null;
  startDate: string;
  dueDate?: string;
  completedAt?: string | null;
  isOverDue?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthSession {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: User;
}

export interface AuthSnapshot {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
}

export interface DailyCategoryStat {
  categoryId: EntityId;
  categoryName: string;
  count: number;
}

export interface DailyStat {
  date: string;
  completedTasks: number;
  completedOfEachCategory: DailyCategoryStat[];
  givenUpTasks: number;
  givenUpOfEachCategory: DailyCategoryStat[];
}

export interface Stat {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  givenUpTasks: number;
  dailyStats: DailyStat[];
}

// Write models are separate from read models: mutation payloads use
// plain EntityId references, never populated response objects.
export type TaskMutationPayload = Partial<{
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  categoryId: EntityId | null;
  projectId: EntityId | null;
  startDate: string;
  dueDate: string | null;
}>;

export type ProjectMutationPayload = Partial<Pick<Project, "name" | "description" | "color" | "status">>;
export type CategoryMutationPayload = Partial<Pick<Category, "name" | "description">>;
export interface LoginPayload {
  email: string;
  password: string;
}
export interface RegisterPayload extends LoginPayload {
  name: string;
  dob: string;
  nationality?: string;
}
export type UpdateProfilePayload = Partial<Pick<User, "email" | "name" | "dob" | "nationality" | "avatarUrl">>;
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
export interface GenerateTasksPayload {
  userRequirement: string;
}
export interface ChatPayload {
  userInput: string;
}
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}
export type GenerateTasksResponse = ApiEnvelope<Task[]>;
export type ChatResponse = ApiEnvelope<string>;
