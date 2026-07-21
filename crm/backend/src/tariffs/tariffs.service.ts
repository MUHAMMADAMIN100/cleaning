import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CleaningType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Дефолтные цены услуг — применяются один раз при первичной инициализации */
const TARIFF_DEFAULTS: {
  key: CleaningType;
  title: string;
  light: number;
  medium: number;
  heavy: number;
  hasLevels: boolean;
  unit: string;
}[] = [
  {
    key: CleaningType.GENERAL,
    title: 'Генеральная уборка',
    light: 25,
    medium: 27,
    heavy: 29,
    hasLevels: true,
    unit: 'м²',
  },
  {
    key: CleaningType.POST_RENOVATION,
    title: 'Уборка после ремонта',
    light: 30,
    medium: 32,
    heavy: 35,
    hasLevels: true,
    unit: 'м²',
  },
  {
    key: CleaningType.FURNITURE,
    title: 'Мойка мягкой мебели',
    light: 70,
    medium: 70,
    heavy: 70,
    hasLevels: false,
    unit: 'место',
  },
];

/** Порядок вывода услуг */
const KEY_ORDER: CleaningType[] = [
  CleaningType.GENERAL,
  CleaningType.POST_RENOVATION,
  CleaningType.FURNITURE,
];

@Injectable()
export class TariffsService implements OnModuleInit {
  private readonly logger = new Logger('Tariffs');

  constructor(private prisma: PrismaService) {}

  /**
   * Первичная инициализация тарифов:
   * - создаём отсутствующие услуги (в т.ч. новую «Мойка мягкой мебели»);
   * - переносим старые тарифы на цены по степеням загрязнения;
   * - удаляем закрытую услугу «Поддерживающая».
   * Идемпотентно: цены, изменённые руководителем, не перезаписываются.
   */
  async onModuleInit() {
    try {
      for (const d of TARIFF_DEFAULTS) {
        const existing = await this.prisma.tariff.findUnique({
          where: { key: d.key },
        });
        if (!existing) {
          await this.prisma.tariff.create({
            data: {
              key: d.key,
              title: d.title,
              pricePerSqm: d.medium,
              priceLight: d.light,
              priceMedium: d.medium,
              priceHeavy: d.heavy,
              hasLevels: d.hasLevels,
              unit: d.unit,
            },
          });
          this.logger.log(`Тариф создан: ${d.title}`);
        } else if (
          existing.priceLight === 0 &&
          existing.priceMedium === 0 &&
          existing.priceHeavy === 0 &&
          existing.pricePerSqm > 0 // только настоящая legacy-строка (не «обнулённая» вручную)
        ) {
          // старый тариф без цен по уровням — первичная миграция
          await this.prisma.tariff.update({
            where: { key: d.key },
            data: {
              title: d.title,
              pricePerSqm: d.medium,
              priceLight: d.light,
              priceMedium: d.medium,
              priceHeavy: d.heavy,
              hasLevels: d.hasLevels,
              unit: d.unit,
            },
          });
          this.logger.log(`Тариф обновлён на уровни цен: ${d.title}`);
        }
      }
      // «Поддерживающая» закрыта — удаляем из тарифов (старые заказы не трогаем)
      await this.prisma.tariff.deleteMany({
        where: { key: CleaningType.MAINTENANCE },
      });
    } catch (e) {
      this.logger.error('Инициализация тарифов не удалась', e as any);
    }
  }

  /** Текущие тарифы и доп. услуги (используется CRM и лендингом) */
  async getAll() {
    const [tariffs, extras] = await Promise.all([
      this.prisma.tariff.findMany({ where: { key: { in: KEY_ORDER } } }),
      this.prisma.extraService.findMany({ orderBy: { price: 'asc' } }),
    ]);
    tariffs.sort((a, b) => KEY_ORDER.indexOf(a.key) - KEY_ORDER.indexOf(b.key));
    return { tariffs, extras };
  }

  updateTariff(
    key: CleaningType,
    prices: {
      priceLight?: number;
      priceMedium?: number;
      priceHeavy?: number;
      /** legacy-формат старого фронтенда (на время деплоя) */
      pricePerSqm?: number;
    },
  ) {
    const num = (v: unknown) =>
      Math.min(Math.max(0, Math.round(Number(v) || 0)), 2_000_000_000);
    // ЧАСТИЧНОЕ обновление: трогаем только переданные поля, чтобы
    // отсутствующие уровни цен НЕ обнулялись.
    const data: {
      priceLight?: number;
      priceMedium?: number;
      priceHeavy?: number;
      pricePerSqm?: number;
    } = {};
    const anyLevel =
      prices.priceLight !== undefined ||
      prices.priceMedium !== undefined ||
      prices.priceHeavy !== undefined;
    if (prices.priceLight !== undefined) data.priceLight = num(prices.priceLight);
    if (prices.priceMedium !== undefined) {
      data.priceMedium = num(prices.priceMedium);
      data.pricePerSqm = num(prices.priceMedium); // legacy-поле = средняя цена
    }
    if (prices.priceHeavy !== undefined) data.priceHeavy = num(prices.priceHeavy);
    // Старый клиент прислал только pricePerSqm — заполняем все уровни им.
    if (!anyLevel && prices.pricePerSqm !== undefined) {
      const v = num(prices.pricePerSqm);
      data.priceLight = v;
      data.priceMedium = v;
      data.priceHeavy = v;
      data.pricePerSqm = v;
    }
    return this.prisma.tariff.update({ where: { key }, data });
  }

  updateExtra(key: string, price: number) {
    return this.prisma.extraService.update({
      where: { key },
      data: { price: Math.max(0, Math.round(Number(price) || 0)) },
    });
  }
}
