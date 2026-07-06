import { Allow } from 'class-validator';

/** Полезная нагрузка заявки с лендинга (структура из формы сайта) */
export class LeadIntakeDto {
  @Allow()
  calculator: {
    area: number;
    cleaningTypeId: 'maintenance' | 'general' | 'post_renovation' | 'furniture';
    dirtLevel?: 'light' | 'medium' | 'heavy';
    seats?: number;
    extras?: Record<string, number>;
  };

  @Allow()
  quiz: {
    date?: string;
    time?: string;
    hasUtilities?: 'yes' | 'no' | '';
    access?: 'keys' | 'onsite' | '';
    comment?: string;
  };

  @Allow()
  contact: {
    name: string;
    phone: string;
    address: string;
  };

  @Allow()
  total: number;

  /** honeypot — должно быть пустым (антиспам) */
  @Allow()
  company?: string;
}
