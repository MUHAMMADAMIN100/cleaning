import { Reveal } from '../ui/Reveal';
import { IconCheck, IconArrowRight } from '../ui/icons';
import { CLEANING_TYPES, CURRENCY } from '../../config/pricing';
import { scrollToId } from '../../lib/scroll';

/** Что входит в каждый тариф (для карточек) */
const INCLUDES: Record<string, string[]> = {
  maintenance: [
    'Влажная уборка полов',
    'Удаление пыли с поверхностей',
    'Уборка кухни и санузла',
    'Вынос мусора',
  ],
  general: [
    'Всё из поддерживающей уборки',
    'Мытьё стёкол и зеркал',
    'Чистка техники снаружи',
    'Труднодоступные места',
    'Дезинфекция санузлов',
  ],
  post_renovation: [
    'Удаление строительной пыли',
    'Очистка от краски и клея',
    'Мойка всех поверхностей',
    'Вынос строительного мусора',
    'Финишная полировка',
  ],
};

export function Tariffs() {
  return (
    <section
      id="tariffs"
      className="relative overflow-hidden bg-navy-gradient py-24 text-white"
    >
      <div className="container-px">
        <Reveal>
          <div className="text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-navy-200">
              Виды уборки
            </p>
            <h2 className="section-title mx-auto max-w-2xl">
              Выберите подходящий формат уборки
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/60">
              Три основных направления под любую задачу. Точную стоимость
              рассчитайте в калькуляторе ниже.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {CLEANING_TYPES.map((type, i) => (
            <Reveal key={type.id} delay={i * 0.1}>
              <div
                className={`relative flex h-full flex-col rounded-3xl p-7 transition-all duration-300 hover:-translate-y-2 ${
                  type.popular
                    ? 'bg-white text-navy-900 shadow-glow ring-2 ring-navy-300'
                    : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                {type.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-navy-800 px-4 py-1 text-xs font-semibold text-white">
                    Популярный выбор
                  </span>
                )}

                <h3 className="text-xl font-bold">{type.title}</h3>
                <div className="mt-3 flex items-end gap-1.5">
                  <span className={type.popular ? 'text-sm text-navy-400' : 'text-sm text-white/50'}>
                    от
                  </span>
                  <span className="text-4xl font-extrabold">{type.pricePerSqm}</span>
                  <span className={type.popular ? 'mb-1 text-sm text-navy-400' : 'mb-1 text-sm text-white/50'}>
                    {CURRENCY} / м²
                  </span>
                </div>
                <p className={`mt-3 text-sm leading-relaxed ${type.popular ? 'text-navy-600' : 'text-white/60'}`}>
                  {type.description}
                </p>

                <ul className="mt-6 flex-1 space-y-3">
                  {INCLUDES[type.id]?.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm">
                      <IconCheck
                        className={`mt-0.5 h-4 w-4 shrink-0 ${type.popular ? 'text-navy-600' : 'text-navy-200'}`}
                      />
                      <span className={type.popular ? 'text-navy-800' : 'text-white/80'}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => scrollToId('calculator')}
                  className={`mt-7 w-full ${type.popular ? 'btn-primary' : 'btn-white'}`}
                >
                  Рассчитать
                  <IconArrowRight className="h-4 w-4" />
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
