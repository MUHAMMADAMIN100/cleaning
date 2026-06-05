import { FieldLabel, OptionCard, TextArea, TextInput } from './fields';
import type { QuizState } from '../../types';

interface Props {
  state: QuizState;
  onChange: (next: QuizState) => void;
  /** Минимальная дата (сегодня) в формате YYYY-MM-DD */
  minDate: string;
}

export function SpecificsStep({ state, onChange, minDate }: Props) {
  const set = <K extends keyof QuizState>(key: K, value: QuizState[K]) =>
    onChange({ ...state, [key]: value });

  return (
    <div className="space-y-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel required>Желаемая дата</FieldLabel>
          <TextInput
            type="date"
            min={minDate}
            value={state.date}
            onChange={(e) => set('date', e.target.value)}
            className="[color-scheme:dark]"
          />
        </div>
        <div>
          <FieldLabel required>Удобное время</FieldLabel>
          <TextInput
            type="time"
            value={state.time}
            onChange={(e) => set('time', e.target.value)}
            className="[color-scheme:dark]"
          />
        </div>
      </div>

      <div>
        <FieldLabel required>
          Есть ли доступ к воде и электричеству на объекте?
        </FieldLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          <OptionCard
            active={state.hasUtilities === 'yes'}
            onClick={() => set('hasUtilities', 'yes')}
            title="Да, всё подключено"
          />
          <OptionCard
            active={state.hasUtilities === 'no'}
            onClick={() => set('hasUtilities', 'no')}
            title="Нет / не уверен(а)"
          />
        </div>
      </div>

      <div>
        <FieldLabel required>Как клинер попадёт на объект?</FieldLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          <OptionCard
            active={state.access === 'keys'}
            onClick={() => set('access', 'keys')}
            title="Передам ключи"
            subtitle="Меня не будет на месте"
          />
          <OptionCard
            active={state.access === 'onsite'}
            onClick={() => set('access', 'onsite')}
            title="Буду на месте"
            subtitle="Встречу клинера лично"
          />
        </div>
      </div>

      <div>
        <FieldLabel>Комментарии и пожелания</FieldLabel>
        <TextArea
          rows={3}
          value={state.comment}
          onChange={(e) => set('comment', e.target.value)}
          placeholder="Например: особое внимание кухне, есть домашние животные, нужна уборка балкона…"
        />
      </div>
    </div>
  );
}
