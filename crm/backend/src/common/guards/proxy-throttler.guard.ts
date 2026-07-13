import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * ThrottlerGuard за прокси Railway. За несколькими хопами req.ip нестабилен,
 * поэтому ключом берём реальный IP клиента — левый элемент X-Forwarded-For.
 * Иначе счётчик rate-limit не накапливается и лимит не срабатывает.
 */
@Injectable()
export class ProxyThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const xff = req.headers?.['x-forwarded-for'];
    if (typeof xff === 'string' && xff.trim()) {
      return xff.split(',')[0].trim(); // исходный клиентский IP
    }
    if (Array.isArray(xff) && xff.length) {
      return String(xff[0]).split(',')[0].trim();
    }
    return req.ip ?? 'unknown';
  }
}
