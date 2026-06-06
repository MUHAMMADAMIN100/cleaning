import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Помечает роут как публичный (без JWT) */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
