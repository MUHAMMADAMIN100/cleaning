import { Reveal } from '../ui/Reveal';
import {
  IconUsers,
  IconLeaf,
  IconShield,
  IconClock,
} from '../ui/icons';

const FEATURES = [
  {
    icon: IconUsers,
    title: 'Проверенный персонал',
    text: 'Каждый клинер проходит проверку и обучение. Вы доверяете дом надёжным людям.',
  },
  {
    icon: IconLeaf,
    title: 'Безопасная химия',
    text: 'Используем сертифицированные средства — безопасно для детей, животных и аллергиков.',
  },
  {
    icon: IconShield,
    title: 'Гарантия сохранности',
    text: 'Бережно относимся к вещам и технике. Несём ответственность за сохранность имущества.',
  },
  {
    icon: IconClock,
    title: 'Точно в срок',
    text: 'Приезжаем вовремя и убираем за оговорённое время. Ценим ваше расписание.',
  },
];

const STATS = [
  ['1500+', 'выполненных уборок'],
  ['5 лет', 'на рынке Душанбе'],
  ['4.9★', 'средняя оценка'],
  ['98%', 'клиентов возвращаются'],
];

export function About() {
  return (
    <section id="about" className="relative bg-navy-950 py-24">
      <div className="container-px">
        <Reveal>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent-light">
            Кто мы
          </p>
          <h2 className="section-title max-w-2xl">
            Клининговая компания, которой доверяют дом и офис
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-white/60">
            «Архыдея клининг» — это команда профессионалов в Душанбе. Мы берём на
            себя уборку, чтобы вы занимались тем, что действительно важно.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <div className="glass-card group h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-glow">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent-light transition-colors group-hover:bg-accent/25">
                  <f.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {f.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Статистика */}
        <Reveal delay={0.1}>
          <div className="mt-12 grid grid-cols-2 gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-navy-800/60 to-navy-900/60 p-8 sm:grid-cols-4">
            {STATS.map(([num, label]) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-extrabold text-accent-light sm:text-4xl">
                  {num}
                </div>
                <div className="mt-1 text-sm text-white/60">{label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
