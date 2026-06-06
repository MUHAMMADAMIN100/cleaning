export type Role = 'DIRECTOR' | 'MANAGER';
export type LeadSource = 'SITE' | 'INSTAGRAM' | 'CALL' | 'RECOMMENDATION';
export type FunnelStage =
  | 'NEW'
  | 'PROCESSING'
  | 'INSPECTION'
  | 'OFFER'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'PAID'
  | 'REJECTED';
export type CleaningType = 'MAINTENANCE' | 'GENERAL' | 'POST_RENOVATION';
export type ClientTag = 'VIP' | 'REGULAR' | 'REFUSED' | 'POTENTIAL';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';
export type ScheduleType = 'INSPECTION' | 'CLEANING_VISIT' | 'MEETING';
export type AccessMethod = 'KEYS' | 'ONSITE';

export interface AuthUser {
  id: string;
  login: string;
  fullName: string;
  role: Role;
}

export interface Manager {
  id: string;
  login: string;
  fullName: string;
  role: Role;
  phone?: string;
  isActive: boolean;
}

export interface Cleaner {
  id: string;
  fullName: string;
  phone?: string;
  isActive: boolean;
  managerId?: string;
  manager?: { id: string; fullName: string } | null;
}

export interface Client {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  source: LeadSource;
  tags: ClientTag[];
  notes?: string;
  lastContactAt: string;
  managerId?: string;
  manager?: { id: string; fullName: string } | null;
  _count?: { orders: number };
  orders?: Order[];
}

export interface Order {
  id: string;
  clientId: string;
  managerId?: string;
  stage: FunnelStage;
  source: LeadSource;
  cleaningType: CleaningType;
  area: number;
  address?: string;
  estimatedPrice: number;
  finalPrice?: number | null;
  preferredDate?: string | null;
  preferredTime?: string | null;
  hasUtilities?: boolean | null;
  accessMethod?: AccessMethod | null;
  comment?: string | null;
  rejectionReason?: string | null;
  inspectionDate?: string | null;
  scheduledDate?: string | null;
  isLarge: boolean;
  createdAt: string;
  closedAt?: string | null;
  client?: { id: string; fullName: string; phone: string };
  manager?: { id: string; fullName: string } | null;
  cleaners?: { id: string; fullName: string }[];
}

export interface BoardColumn {
  stage: FunnelStage;
  label: string;
  orders: Order[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline?: string | null;
  assigneeId: string;
  creatorId: string;
  assignee: { id: string; fullName: string };
  creator: { id: string; fullName: string };
  createdAt: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  type: ScheduleType;
  date: string;
  note?: string;
  orderId?: string;
  managerId: string;
  manager?: { id: string; fullName: string };
}

export interface NotificationItem {
  id: string;
  type: 'NEW_LEAD' | 'NEW_TASK' | 'ORDER_STATUS_CHANGED';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Analytics {
  byType: { type: CleaningType; label: string; count: number }[];
  sources: { source: LeadSource; label: string; count: number }[];
  conversion: { total: number; paid: number; rejected: number; rate: number };
  revenue?: { day: number; week: number; month: number; quarter: number };
  revenueSeries?: { date: string; revenue: number }[];
  managerWorkload?: { id: string; name: string; active: number; paid: number }[];
}

export interface Tariffs {
  tariffs: { id: string; key: CleaningType; title: string; pricePerSqm: number }[];
  extras: { id: string; key: string; title: string; price: number; hasQty: boolean }[];
}
