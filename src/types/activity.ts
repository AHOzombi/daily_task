export type TaskActivityAction = 'create' | 'update' | 'delete' | 'status_change';

export interface TaskActivityRecord {
  id: string;
  userId?: string;
  taskId: string;
  taskTitle: string;
  action: TaskActivityAction;
  detail: string;
  createdAt: string;
}
