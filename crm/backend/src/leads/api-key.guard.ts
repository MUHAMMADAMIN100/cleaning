import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

/** Защита эндпоинта приёма заявок ключом из заголовка x-api-key */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const key = req.headers['x-api-key'];
    const expected = process.env.LEADS_INTAKE_API_KEY;
    if (!expected || key !== expected) {
      throw new UnauthorizedException('Неверный API-ключ');
    }
    return true;
  }
}
