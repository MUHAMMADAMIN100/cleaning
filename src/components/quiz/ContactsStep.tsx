import { FieldLabel, TextInput } from './fields';
import { IconMapPin } from '../ui/icons';
import type { ContactState } from '../../types';

interface Props {
  state: ContactState;
  onChange: (next: ContactState) => void;
  errors: Partial<Record<keyof ContactState, boolean>>;
}

/** Форматирует ввод как +992 XX XXX XX XX, прочно закрепляя префикс +992. */
export function formatTjPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('992')) digits = digits.slice(3);
  digits = digits.slice(0, 9); // 9 цифр номера
  let out = '+992';
  if (digits.length) out += ' ' + digits.slice(0, 2);
  if (digits.length > 2) out += ' ' + digits.slice(2, 5);
  if (digits.length > 5) out += ' ' + digits.slice(5, 7);
  if (digits.length > 7) out += ' ' + digits.slice(7, 9);
  return out;
}

export function ContactsStep({ state, onChange, errors }: Props) {
  const set = <K extends keyof ContactState>(key: K, value: ContactState[K]) =>
    onChange({ ...state, [key]: value });

  return (
    <div className="space-y-5">
      <div>
        <FieldLabel required>Ваше имя</FieldLabel>
        <TextInput
          value={state.name}
          invalid={errors.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Как к вам обращаться"
          autoComplete="name"
        />
      </div>

      <div>
        <FieldLabel required>Номер телефона</FieldLabel>
        <TextInput
          type="tel"
          inputMode="numeric"
          value={state.phone || '+992 '}
          invalid={errors.phone}
          onChange={(e) => set('phone', formatTjPhone(e.target.value))}
          onFocus={(e) => {
            if (!state.phone) set('phone', '+992 ');
            // курсор в конец
            requestAnimationFrame(() =>
              e.target.setSelectionRange(
                e.target.value.length,
                e.target.value.length,
              ),
            );
          }}
          placeholder="+992 __ ___ __ __"
          autoComplete="tel"
        />
        {errors.phone && (
          <p className="mt-1.5 text-xs text-red-500">
            Введите корректный номер телефона
          </p>
        )}
      </div>

      <div>
        <FieldLabel required>Адрес объекта</FieldLabel>
        <div className="relative">
          <IconMapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy-400" />
          <TextInput
            value={state.address}
            invalid={errors.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="Район, улица, дом, квартира"
            autoComplete="street-address"
            className="!pl-12"
          />
        </div>
      </div>

      <p className="pt-1 text-xs text-navy-400">
        Нажимая «Отправить заявку», вы соглашаетесь на обработку персональных
        данных. Мы свяжемся с вами для подтверждения.
      </p>
    </div>
  );
}
