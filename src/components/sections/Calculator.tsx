import { Reveal } from '../ui/Reveal';
import { QuizForm } from '../quiz/QuizForm';

export function Calculator() {
  return (
    <section id="calculator" className="relative bg-navy-50 py-24 text-navy-900">
      <div className="container-px relative">
        <Reveal>
          <div className="text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              Калькулятор и заявка
            </p>
            <h2 className="section-title mx-auto max-w-2xl">
              Рассчитайте стоимость и оформите заявку
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-navy-600">
              Укажите параметры — увидите цену сразу. Затем заполните детали
              заказа. Это займёт меньше минуты.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-12">
            <QuizForm />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
