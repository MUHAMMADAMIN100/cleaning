/** Полезная нагрузка заявки с лендинга (структура из формы сайта) */
export class LeadIntakeDto {
  calculator: {
    area: number;
    cleaningTypeId: 'maintenance' | 'general' | 'post_renovation';
    extras?: Record<string, number>;
  };
  quiz: {
    date?: string;
    time?: string;
    hasUtilities?: 'yes' | 'no' | '';
    access?: 'keys' | 'onsite' | '';
    comment?: string;
  };
  contact: {
    name: string;
    phone: string;
    address: string;
  };
  total: number;
  /** honeypot — должно быть пустым (антиспам) */
  company?: string;
}
