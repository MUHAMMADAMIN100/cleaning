let counter = 0;

/** Временный id для оптимистично созданных элементов (до ответа сервера) */
export function tempId(): string {
  counter += 1;
  return `temp_${counter}`;
}

/** Текущая дата в ISO (для оптимистичных элементов) */
export function nowISO(): string {
  return new Date().toISOString();
}
