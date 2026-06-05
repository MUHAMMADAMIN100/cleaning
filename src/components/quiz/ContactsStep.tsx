import { FieldLabel, TextInput } from './fields';
import { IconMapPin } from '../ui/icons';
import type { ContactState } from '../../types';

interface Props {
  state: ContactState;
  onChange: (next: ContactState) => void;
  errors: Partial<Record<keyof ContactState, boolean>>;
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
          value={state.phone}
          invalid={errors.phone}
          onChange={(e) => set('phone', e.target.value)}
          placeholder="+992 __ ___ __ __"
          autoComplete="tel"
        />
        {errors.phone && (
          <p className="mt-1.5 text-xs text-red-300">
            Введите корректный номер телефона
          </p>
        )}
      </div>

      <div>
        <FieldLabel required>Адрес объекта</FieldLabel>
        <div className="relative">
          <IconMapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
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

      <p className="pt-1 text-xs text-white/40">
        Нажимая «Отправить заявку», вы соглашаетесь на обработку персональных
        данных. Мы свяжемся с вами для подтверждения.
      </p>
    </div>
  );
}
