/* eslint-disable */
import {
  PrismaClient,
  Role,
  LeadSource,
  CleaningType,
  FunnelStage,
  ClientTag,
  TaskPriority,
  TaskStatus,
  ScheduleType,
  NotificationType,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const hash = (p: string) => bcrypt.hash(p, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
const daysAhead = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

async function main() {
  console.log('🌱 Очистка и засев базы…');

  // Полная очистка (порядок важен из-за связей)
  await prisma.notification.deleteMany();
  await prisma.scheduleEvent.deleteMany();
  await prisma.task.deleteMany();
  await prisma.order.deleteMany();
  await prisma.client.deleteMany();
  await prisma.cleaner.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tariff.deleteMany();
  await prisma.extraService.deleteMany();

  // ── Пользователи ──
  const director = await prisma.user.create({
    data: {
      login: 'director',
      passwordHash: await hash('director123'),
      fullName: 'Алишер Рахимов',
      role: Role.DIRECTOR,
      phone: '+992 90 000 00 01',
    },
  });
  const manager1 = await prisma.user.create({
    data: {
      login: 'manager1',
      passwordHash: await hash('manager123'),
      fullName: 'Дилноза Каримова',
      role: Role.MANAGER,
      phone: '+992 90 000 00 02',
    },
  });
  const manager2 = await prisma.user.create({
    data: {
      login: 'manager2',
      passwordHash: await hash('manager123'),
      fullName: 'Фаррух Назаров',
      role: Role.MANAGER,
      phone: '+992 90 000 00 03',
    },
  });

  // ── Клинеры (команды) ──
  const cl1 = await prisma.cleaner.create({
    data: { fullName: 'Сафар Холов', phone: '+992 91 111 11 11', managerId: manager1.id },
  });
  const cl2 = await prisma.cleaner.create({
    data: { fullName: 'Зухра Расулова', phone: '+992 91 222 22 22', managerId: manager1.id },
  });
  const cl3 = await prisma.cleaner.create({
    data: { fullName: 'Бахтиёр Юсупов', phone: '+992 91 333 33 33', managerId: manager2.id },
  });
  const cl4 = await prisma.cleaner.create({
    data: { fullName: 'Малика Шарипова', phone: '+992 91 444 44 44', managerId: manager2.id },
  });

  // ── Тарифы и доп. услуги (как на лендинге) ──
  await prisma.tariff.createMany({
    data: [
      { key: CleaningType.MAINTENANCE, title: 'Поддерживающая', pricePerSqm: 25 },
      { key: CleaningType.GENERAL, title: 'Генеральная', pricePerSqm: 25 },
      { key: CleaningType.POST_RENOVATION, title: 'После ремонта', pricePerSqm: 25 },
    ],
  });
  await prisma.extraService.createMany({
    data: [
      { key: 'windows', title: 'Мытьё окон', price: 50, hasQty: true },
      { key: 'fridge', title: 'Мытьё холодильника внутри', price: 80 },
      { key: 'oven', title: 'Чистка духовки', price: 70 },
      { key: 'ironing', title: 'Глажка белья (1 час)', price: 90 },
    ],
  });

  // ── Клиенты и заказы по всем этапам воронки ──
  type Seed = {
    name: string;
    phone: string;
    source: LeadSource;
    managerId: string;
    tags?: ClientTag[];
    stage: FunnelStage;
    type: CleaningType;
    area: number;
    price: number;
    final?: number;
    closedDaysAgo?: number;
    createdDaysAgo: number;
    rejectionReason?: string;
    scheduledIn?: number;
    cleaners?: string[];
  };

  const seeds: Seed[] = [
    { name: 'Нигина Саидова', phone: '+992 92 100 10 01', source: LeadSource.SITE, managerId: manager1.id, stage: FunnelStage.NEW, type: CleaningType.GENERAL, area: 60, price: 1500, createdDaysAgo: 0 },
    { name: 'Рустам Бобоев', phone: '+992 92 100 10 02', source: LeadSource.INSTAGRAM, managerId: manager1.id, stage: FunnelStage.PROCESSING, type: CleaningType.MAINTENANCE, area: 45, price: 1125, createdDaysAgo: 1 },
    { name: 'Шахноза Мирзоева', phone: '+992 92 100 10 03', source: LeadSource.SITE, managerId: manager2.id, stage: FunnelStage.INSPECTION, type: CleaningType.POST_RENOVATION, area: 90, price: 2250, createdDaysAgo: 2, scheduledIn: 2 },
    { name: 'Джамшед Холов', phone: '+992 92 100 10 04', source: LeadSource.CALL, managerId: manager1.id, stage: FunnelStage.OFFER, type: CleaningType.GENERAL, area: 120, price: 3000, final: 3200, createdDaysAgo: 3 },
    { name: 'Манижа Азимова', phone: '+992 92 100 10 05', source: LeadSource.RECOMMENDATION, managerId: manager2.id, tags: [ClientTag.VIP], stage: FunnelStage.CONFIRMED, type: CleaningType.GENERAL, area: 150, price: 3750, final: 3750, createdDaysAgo: 4, scheduledIn: 1, cleaners: [cl3.id, cl4.id] },
    { name: 'Олим Сафаров', phone: '+992 92 100 10 06', source: LeadSource.SITE, managerId: manager1.id, stage: FunnelStage.IN_PROGRESS, type: CleaningType.MAINTENANCE, area: 50, price: 1250, final: 1250, createdDaysAgo: 5, scheduledIn: 0, cleaners: [cl1.id, cl2.id] },
    { name: 'Гулноза Раджабова', phone: '+992 92 100 10 07', source: LeadSource.INSTAGRAM, managerId: manager2.id, stage: FunnelStage.DONE, type: CleaningType.GENERAL, area: 70, price: 1750, final: 1800, createdDaysAgo: 6 },
    { name: 'Сухроб Каримов', phone: '+992 92 100 10 08', source: LeadSource.SITE, managerId: manager1.id, tags: [ClientTag.REGULAR], stage: FunnelStage.PAID, type: CleaningType.GENERAL, area: 80, price: 2000, final: 2000, createdDaysAgo: 10, closedDaysAgo: 2 },
    { name: 'Фотима Назарова', phone: '+992 92 100 10 09', source: LeadSource.CALL, managerId: manager2.id, tags: [ClientTag.REGULAR], stage: FunnelStage.PAID, type: CleaningType.POST_RENOVATION, area: 100, price: 2500, final: 2700, createdDaysAgo: 14, closedDaysAgo: 5 },
    { name: 'Бехруз Одинаев', phone: '+992 92 100 10 10', source: LeadSource.SITE, managerId: manager1.id, stage: FunnelStage.PAID, type: CleaningType.MAINTENANCE, area: 40, price: 1000, final: 1000, createdDaysAgo: 8, closedDaysAgo: 1 },
    { name: 'Зарина Усманова', phone: '+992 92 100 10 11', source: LeadSource.INSTAGRAM, managerId: manager2.id, tags: [ClientTag.REFUSED], stage: FunnelStage.REJECTED, type: CleaningType.GENERAL, area: 55, price: 1375, createdDaysAgo: 7, rejectionReason: 'Дорого, выбрали другую компанию' },
    { name: 'Носир Шоев', phone: '+992 92 100 10 12', source: LeadSource.SITE, managerId: manager1.id, tags: [ClientTag.POTENTIAL], stage: FunnelStage.PROCESSING, type: CleaningType.GENERAL, area: 65, price: 1625, createdDaysAgo: 1 },
  ];

  for (const s of seeds) {
    const client = await prisma.client.create({
      data: {
        fullName: s.name,
        phone: s.phone.replace(/\D/g, ''),
        source: s.source,
        managerId: s.managerId,
        tags: s.tags ?? [],
        lastContactAt: daysAgo(s.createdDaysAgo),
      },
    });
    await prisma.order.create({
      data: {
        clientId: client.id,
        managerId: s.managerId,
        stage: s.stage,
        source: s.source,
        cleaningType: s.type,
        area: s.area,
        estimatedPrice: s.price,
        finalPrice: s.final ?? null,
        isLarge: (s.final ?? s.price) >= 2000,
        rejectionReason: s.rejectionReason,
        scheduledDate: s.scheduledIn !== undefined ? daysAhead(s.scheduledIn) : null,
        closedAt: s.closedDaysAgo !== undefined ? daysAgo(s.closedDaysAgo) : null,
        createdAt: daysAgo(s.createdDaysAgo),
        cleaners: s.cleaners ? { connect: s.cleaners.map((id) => ({ id })) } : undefined,
      },
    });
  }

  // ── Задачи от руководителя ──
  await prisma.task.create({
    data: {
      title: 'Обзвонить новые заявки за сегодня',
      description: 'Связаться со всеми клиентами на этапе «Новая заявка».',
      assigneeId: manager1.id,
      creatorId: director.id,
      priority: TaskPriority.HIGH,
      deadline: daysAhead(1),
      status: TaskStatus.OPEN,
    },
  });
  await prisma.task.create({
    data: {
      title: 'Подготовить КП для Джамшеда Холова',
      assigneeId: manager1.id,
      creatorId: director.id,
      priority: TaskPriority.MEDIUM,
      deadline: daysAhead(2),
      status: TaskStatus.IN_PROGRESS,
    },
  });
  await prisma.task.create({
    data: {
      title: 'Проверить качество уборки у VIP-клиента',
      assigneeId: manager2.id,
      creatorId: director.id,
      priority: TaskPriority.HIGH,
      deadline: daysAhead(1),
      status: TaskStatus.OPEN,
    },
  });

  // ── Расписание ──
  await prisma.scheduleEvent.create({
    data: {
      title: 'Осмотр объекта — Шахноза Мирзоева',
      type: ScheduleType.INSPECTION,
      date: daysAhead(2),
      managerId: manager2.id,
      note: '90 м², после ремонта',
    },
  });
  await prisma.scheduleEvent.create({
    data: {
      title: 'Выезд команды — Олим Сафаров',
      type: ScheduleType.CLEANING_VISIT,
      date: new Date(),
      managerId: manager1.id,
    },
  });

  // ── Уведомления ──
  await prisma.notification.create({
    data: {
      userId: manager1.id,
      type: NotificationType.NEW_LEAD,
      title: 'Новая заявка с сайта',
      message: 'Нигина Саидова · 60 м² · 1500 сомони',
    },
  });
  await prisma.notification.create({
    data: {
      userId: manager1.id,
      type: NotificationType.NEW_TASK,
      title: 'Новая задача от руководителя',
      message: 'Обзвонить новые заявки за сегодня',
    },
  });

  console.log('✅ База засеяна.');
  console.log('───────────────────────────');
  console.log('Логины для входа:');
  console.log('  Руководитель: director / director123');
  console.log('  Менеджер 1:   manager1 / manager123');
  console.log('  Менеджер 2:   manager2 / manager123');
  console.log('───────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
