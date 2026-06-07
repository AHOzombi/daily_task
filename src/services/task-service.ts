import { seedTasks } from '../mocks/task-data';
import type { CreateTaskInput, TaskFilters, TaskPageResult, TaskRecord, UpdateTaskInput } from '../types/task';

let taskStore: TaskRecord[] = [...seedTasks];

function matchesKeyword(task: TaskRecord, keyword: string) {
  if (!keyword.trim()) return true;
  const normalized = keyword.trim().toLowerCase();
  return (
    task.title.toLowerCase().includes(normalized) ||
    task.description.toLowerCase().includes(normalized)
  );
}

function applyFilters(tasks: TaskRecord[], filters: TaskFilters) {
  return tasks.filter((task) => {
    const statusOk = filters.status === 'all' || task.status === filters.status;
    const priorityOk = filters.priority === 'all' || task.priority === filters.priority;
    const keywordOk = matchesKeyword(task, filters.keyword);
    return statusOk && priorityOk && keywordOk;
  });
}

function paginate(tasks: TaskRecord[], filters: TaskFilters): TaskPageResult {
  const total = tasks.length;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const page = Math.min(filters.page, totalPages);
  const start = (page - 1) * filters.pageSize;
  const list = tasks.slice(start, start + filters.pageSize);

  return {
    list,
    total,
    totalPages,
    page,
    pageSize: filters.pageSize
  };
}

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const taskService = {
  async list(filters: TaskFilters): Promise<TaskPageResult> {
    const filtered = applyFilters(taskStore, filters);
    return delay(paginate(filtered, filters));
  },

  async getAll(): Promise<TaskRecord[]> {
    return delay(taskStore);
  },

  async create(input: CreateTaskInput): Promise<TaskRecord> {
    const now = new Date().toISOString();
    const created: TaskRecord = {
      id: `task-${Date.now()}`,
      userId: input.userId ?? '',
      isPublic: input.isPublic ?? false,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate,
      tags: input.tags,
      project: input.project,
      subtasks: input.subtasks,
      notes: input.notes,
      review: input.review,
      createdAt: now,
      updatedAt: now
    };

    taskStore = [created, ...taskStore];
    return delay(created);
  },

  async update(input: UpdateTaskInput): Promise<TaskRecord> {
    let updatedTask: TaskRecord | null = null;

    taskStore = taskStore.map((task) => {
      if (task.id !== input.id) return task;
      updatedTask = {
        ...task,
        ...input,
        updatedAt: new Date().toISOString()
      };
      return updatedTask;
    });

    if (!updatedTask) {
      throw new Error('Task not found');
    }

    return delay(updatedTask);
  },

  async remove(id: string): Promise<void> {
    taskStore = taskStore.filter((task) => task.id !== id);
    return delay(undefined);
  },

  async updateStatus(id: string, status: TaskRecord['status']): Promise<TaskRecord> {
    const target = taskStore.find((task) => task.id === id);
    if (!target) {
      throw new Error('Task not found');
    }

    return this.update({
      id,
      title: target.title,
      description: target.description,
      status,
      priority: target.priority,
      dueDate: target.dueDate,
      tags: target.tags,
      project: target.project,
      subtasks: target.subtasks,
      notes: target.notes,
      review: target.review
    });
  }
};
