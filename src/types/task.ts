export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskTag = '工作' | '学习' | '生活' | 'AI Agent' | '自动化' | '复盘';
export type TaskProject = 'Task系统' | 'OpenClaw' | '自动化实验' | '阅读复盘' | '个人事务';

export interface TaskSubtask {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskRecord {
  id: string;
  userId: string;
  isPublic?: boolean;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  tags: TaskTag[];
  project: TaskProject;
  subtasks: TaskSubtask[];
  notes: string;
  review: string;
}

export interface TaskFilters {
  keyword: string;
  status: TaskStatus | 'all' | 'active';
  priority: TaskPriority | 'all';
  tag: TaskTag | 'all';
  project: TaskProject | 'all';
  page: number;
  pageSize: number;
}

export interface TaskPageResult {
  list: TaskRecord[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface CreateTaskInput {
  userId?: string;
  isPublic?: boolean;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  tags: TaskTag[];
  project: TaskProject;
  subtasks: TaskSubtask[];
  notes: string;
  review: string;
}

export interface UpdateTaskInput extends CreateTaskInput {
  id: string;
}
