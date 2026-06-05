import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /** Задержка появления, сек */
  delay?: number;
  /** Направление въезда */
  y?: number;
  className?: string;
}

/**
 * Обёртка для анимации появления при скролле.
 * Элемент плавно въезжает снизу и проявляется, когда попадает во вьюпорт.
 */
export function Reveal({ children, delay = 0, y = 28, className }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
