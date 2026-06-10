import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Modal } from './ui';

interface ConfirmOpts {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}
interface PromptOpts {
  title: string;
  message?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

interface DialogApi {
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
  prompt: (opts: PromptOpts) => Promise<string | null>;
}

const Ctx = createContext<DialogApi>({
  confirm: async () => false,
  prompt: async () => null,
});

export const useDialog = () => useContext(Ctx);

type State =
  | { kind: 'confirm'; opts: ConfirmOpts }
  | { kind: 'prompt'; opts: PromptOpts }
  | null;

export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(null);
  const [value, setValue] = useState('');
  const resolver = useRef<((v: any) => void) | null>(null);

  const close = (result: any) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
    setValue('');
  };

  const api: DialogApi = {
    confirm: (opts) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setState({ kind: 'confirm', opts });
      }),
    prompt: (opts) =>
      new Promise<string | null>((resolve) => {
        resolver.current = resolve;
        setValue('');
        setState({ kind: 'prompt', opts });
      }),
  };

  const isPrompt = state?.kind === 'prompt';
  const danger = state?.kind === 'confirm' && state.opts.danger;

  return (
    <Ctx.Provider value={api}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(isPrompt ? null : false)}
        title={state?.opts.title ?? ''}
      >
        {state && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  danger ? 'bg-red-100 text-red-600' : 'bg-navy-100 text-navy-600'
                }`}
              >
                {danger ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <HelpCircle className="h-5 w-5" />
                )}
              </span>
              {state.opts.message && (
                <p className="pt-1 text-sm text-navy-600">{state.opts.message}</p>
              )}
            </div>

            {isPrompt && (
              <input
                autoFocus
                className="input"
                value={value}
                placeholder={(state.opts as PromptOpts).placeholder}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && value.trim()) close(value.trim());
                }}
              />
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => close(isPrompt ? null : false)}
                className="btn-ghost"
              >
                {state.opts.cancelText ?? 'Отмена'}
              </button>
              <button
                onClick={() => {
                  if (isPrompt) {
                    if (value.trim()) close(value.trim());
                  } else {
                    close(true);
                  }
                }}
                disabled={isPrompt && !value.trim()}
                className={danger ? 'btn-danger' : 'btn-primary'}
              >
                {state.opts.confirmText ?? (isPrompt ? 'Готово' : 'Подтвердить')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Ctx.Provider>
  );
}
