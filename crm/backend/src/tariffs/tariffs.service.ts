import { Injectable } from '@nestjs/common';
import { CleaningType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TariffsService {
  constructor(private prisma: PrismaService) {}

  /** Текущие тарифы и доп. услуги (используется CRM и лендингом) */
  async getAll() {
    const [tariffs, extras] = await Promise.all([
      this.prisma.tariff.findMany({ orderBy: { pricePerSqm: 'asc' } }),
      this.prisma.extraService.findMany({ orderBy: { price: 'asc' } }),
    ]);
    return { tariffs, extras };
  }

  updateTariff(key: CleaningType, pricePerSqm: number) {
    return this.prisma.tariff.update({
      where: { key },
      data: { pricePerSqm },
    });
  }

  updateExtra(key: string, price: number) {
    return this.prisma.extraService.update({
      where: { key },
      data: { price },
    });
  }
}
