// WorkOrder types — 所有工单数据模型

export type WorkOrderType = '故障' | '咨询' | '变更' | '优化';

export interface WorkOrder {
  id: string;
  userId: string;        // 所有者 ID（新增）
  date: string;          // YYYY-MM-DD 开始时间
  endDate: string;       // YYYY-MM-DD 结束时间（可选）
  service: string;       // 项目名称
  requester: string;     // 需求人
  type: WorkOrderType;
  description: string;    // 问题描述（工作内容）
  solution: string;       // 处理方案（措施）
  duration?: number;     // 分钟（可选）
  handler: string;       // 处理人
  createdAt: string;     // ISO timestamp
}

export interface CreateWorkOrderInput {
  date: string;
  endDate?: string;
  service: string;
  requester?: string;
  type: WorkOrderType;
  description?: string;
  solution?: string;
  duration?: number;
  handler?: string;
}

export interface WorkOrderFilters {
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
}
