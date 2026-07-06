import { useEffect, useState } from 'react';
import {
  CLEANING_TYPES,
  EXTRA_SERVICES,
  type CleaningType,
  type ExtraService,
} from '../config/pricing';

/**
 * Живые цены из CRM «Archidea Sistem».
 * Публичный эндпоинт GET /tariffs отдаёт актуальные тарифы —
 * руководитель меняет цены в CRM, сайт подхватывает автоматически.
 * При недоступности CRM используются резервные цены из config/pricing.ts.
 */

export interface Pricing {
  types: CleaningType[];
  extras: ExtraService[];
}

const STATIC_PRICING: Pricing = {
  types: CLEANING_TYPES,
  extras: EXTRA_SERVICES,
};

/** CRM key → id услуги на лендинге */
const KEY_TO_ID: Record<string, CleaningType['id']> = {
  GENERAL: 'general',
  POST_RENOVATION: 'post_renovation',
  FURNITURE: 'furniture',
};

let cached: Pricing | null = null;
let inflight: Promise<Pricing | null> | null = null;

async function fetchLive(): Promise<Pricing | null> {
  const apiUrl = import.meta.env.VITE_CRM_API_URL as string | undefined;
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/tariffs`);
    if (!res.ok) return null;
    const data: {
      tariffs?: {
        key: string;
        priceLight: number;
        priceMedium: number;
        priceHeavy: number;
      }[];
      extras?: { key: string; price: number }[];
    } = await res.json();

    // накладываем живые цены на статическую конфигурацию
    const types = CLEANING_TYPES.map((t) => {
      const row = (data.tariffs ?? []).find((x) => KEY_TO_ID[x.key] === t.id);
      if (!row) return t;
      const light = Number(row.priceLight);
      const medium = Number(row.priceMedium);
      const heavy = Number(row.priceHeavy);
      if (!(light > 0)) return t; // защита от пустых/битых данных
      return {
        ...t,
        prices: {
          light,
          medium: medium > 0 ? medium : light,
          heavy: heavy > 0 ? heavy : light,
        },
      };
    });
    const extras = EXTRA_SERVICES.map((e) => {
      const row = (data.extras ?? []).find((x) => x.key === e.id);
      return row && Number(row.price) > 0 ? { ...e, price: Number(row.price) } : e;
    });
    return { types, extras };
  } catch {
    return null;
  }
}

function loadLive(): Promise<Pricing | null> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetchLive().then((p) => {
      if (p) cached = p;
      return p;
    });
  }
  return inflight;
}

/** Актуальные цены: мгновенно резервные, затем живые из CRM */
export function usePricing(): Pricing {
  const [pricing, setPricing] = useState<Pricing>(() => cached ?? STATIC_PRICING);
  useEffect(() => {
    let active = true;
    loadLive().then((p) => {
      if (active && p) setPricing(p);
    });
    return () => {
      active = false;
    };
  }, []);
  return pricing;
}
