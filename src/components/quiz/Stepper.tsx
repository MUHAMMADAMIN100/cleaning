import { motion } from 'framer-motion';
import { IconCheck } from '../ui/icons';

interface Props {
  current: number;
  titles: string[];
}

/** Индикатор прогресса пошаговой формы */
export function Stepper({ current, titles }: Props) {
  return (
    <div className="flex items-center">
      {titles.map((title, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <div key={title} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-3">
              <div className="relative">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: isActive || isDone ? '#0078c9' : '#c9e6f8',
                    color: isActive || isDone ? '#ffffff' : '#5fb1e8',
                    scale: isActive ? 1.1 : 1,
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                >
                  {isDone ? <IconCheck className="h-5 w-5" /> : i + 1}
                </motion.div>
              </div>
              <span
                className={`hidden text-sm font-medium transition-colors sm:block ${
                  isActive ? 'text-navy-900' : isDone ? 'text-navy-600' : 'text-navy-400'
                }`}
              >
                {title}
              </span>
            </div>
            {i < titles.length - 1 && (
              <div className="mx-3 h-px flex-1 overflow-hidden rounded bg-navy-100">
                <motion.div
                  initial={false}
                  animate={{ width: isDone ? '100%' : '0%' }}
                  transition={{ duration: 0.4 }}
                  className="h-full bg-navy-700"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
