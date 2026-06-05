/**
 * ============================================================
 *  КОНФИГУРАЦИЯ ЦЕН «Архыдея клининг»
 * ============================================================
 *  Все ставки и цены вынесены сюда, чтобы их можно было менять
 *  в одном месте без правок логики/верстки.
 *  Валюта — сомони (TJS). Цены тестовые (рыночные).
 *  В будущем эти значения можно отдавать из админки/CRM.
 * ============================================================
 */

export const CURRENCY = 'сомони';

/** Тип уборки — ставка за 1 м² */
export interface CleaningType {
  id: 'maintenance' | 'general' | 'post_renovation';
  title: string;
  pricePerSqm: number;
  description: string;
  popular?: boolean;
}

export const CLEANING_TYPES: CleaningType[] = [
  {
    id: 'maintenance',
    title: 'Поддерживающая',
    pricePerSqm: 15,
    description:
      'Регулярная уборка для поддержания чистоты: полы, пыль, санузлы, кухня.',
  },
  {
    id: 'general',
    title: 'Генеральная',
    pricePerSqm: 25,
    description:
      'Глубокая уборка всей квартиры до блеска: труднодоступные места, техника снаружи, стекла.',
    popular: true,
  },
  {
    id: 'post_renovation',
    title: 'После ремонта',
    pricePerSqm: 35,
    description:
      'Удаление строительной пыли, следов краски и клея, вынос мусора, мойка всех поверхностей.',
  },
];

/** Дополнительная услуга с фиксированной ценой */
export interface ExtraService {
  id: 'windows' | 'fridge' | 'oven' | 'ironing';
  title: string;
  /** Цена за единицу */
  price: number;
  /** true — можно указать количество (шт.), false — разовая опция */
  hasQuantity: boolean;
  unit?: string;
  hint?: string;
}

export const EXTRA_SERVICES: ExtraService[] = [
  {
    id: 'windows',
    title: 'Мытьё окон',
    price: 50,
    hasQuantity: true,
    unit: 'шт',
    hint: 'Цена за одно окно (с двух сторон)',
  },
  {
    id: 'fridge',
    title: 'Мытьё холодильника внутри',
    price: 80,
    hasQuantity: false,
  },
  {
    id: 'oven',
    title: 'Чистка духовки',
    price: 70,
    hasQuantity: false,
  },
  {
    id: 'ironing',
    title: 'Глажка белья (1 час)',
    price: 90,
    hasQuantity: false,
  },
];

/** Минимальная стоимость заказа (защита от слишком маленькой суммы) */
export const MIN_ORDER_PRICE = 150;

/** Значения по умолчанию для калькулятора */
export const DEFAULTS = {
  area: 50,
  cleaningTypeId: 'general' as CleaningType['id'],
};
