import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { securityConfig } from '../../config';

@Injectable()
export class JwtAdminGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        const jwt = request.jwt;

        const admins: string[] = securityConfig.admins;
        if (!admins) {
            return false;
        }

        return admins.includes(jwt.address);
    }
}
