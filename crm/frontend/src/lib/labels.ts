import type {
  CleaningType,
  ClientTag,
  FunnelStage,
  LeadSource,
  ScheduleType,
  TaskPriority,
  TaskStatus,
} from '../types';

export const STAGE_LABEL: Record<FunnelStage, string> = {
  NEW: 'Новая заявка',
  PROCESSING: 'Обработка',
  INSPECTION: 'Осмотр объекта',
  OFFER: 'Коммерческое предложение',
  CONFIRMED: 'Подтверждён',
  IN_PROGRESS: 'В работе',
  DONE: 'Выполнено',
  PAID: 'Оплачено / Закрыто',
  REJECTED: 'Отказ',
};

export const STAGE_ORDER: FunnelStage[] = [
  'NEW',
  'PROCESSING',
  'INSPECTION',
  'OFFER',
  'CONFIRMED',
  'IN_PROGRESS',
  'DONE',
  'PAID',
  'REJECTED',
];

/** Цвет «таблетки» этапа */
export const STAGE_COLOR: Record<FunnelStage, string> = {
  NEW: 'bg-navy-100 text-navy-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  INSPECTION: 'bg-amber-100 text-amber-700',
  OFFER: 'bg-purple-100 text-purple-700',
  CONFIRMED: 'bg-cyan-100 text-cyan-700',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  DONE: 'bg-teal-100 text-teal-700',
  PAID: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export const TYPE_LABEL: Record<CleaningType, string> = {
  MAINTENANCE: 'Поддерживающая',
  GENERAL: 'Генеральная',
  POST_RENOVATION: 'После ремонта',
};

export const SOURCE_LABEL: Record<LeadSource, string> = {
  SITE: 'Сайт',
  INSTAGRAM: 'Instagram',
  CALL: 'Звонок',
  RECOMMENDATION: 'Рекомендация',
};

export const TAG_LABEL: Record<ClientTag, string> = {
  VIP: 'VIP',
  REGULAR: 'Постоянный',
  REFUSED: 'Отказник',
  POTENTIAL: 'Потенциальный',
};

export const TAG_COLOR: Record<ClientTag, string> = {
  VIP: 'bg-amber-100 text-amber-700',
  REGULAR: 'bg-green-100 text-green-700',
  REFUSED: 'bg-red-100 text-red-700',
  POTENTIAL: 'bg-blue-100 text-blue-700',
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
};

export const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: 'bg-navy-100 text-navy-600',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-red-100 text-red-700',
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  OPEN: 'Открыта',
  IN_PROGRESS: 'В работе',
  DONE: 'Выполнена',
};

export const SCHEDULE_LABEL: Record<ScheduleType, string> = {
  INSPECTION: 'Осмотр объекта',
  CLEANING_VISIT: 'Выезд команды',
  MEETING: 'Встреча',
};

export function formatPrice(v?: number | null): string {
  if (v == null) return '—';
  return `${v.toLocaleString('ru-RU')} сомони`;
}

export function formatDate(s?: string | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(s?: string | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
