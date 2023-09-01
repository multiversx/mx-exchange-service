import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenError } from '@nestjs/apollo';
import { JwtPayload, verify } from 'jsonwebtoken';
import { ApiConfigService } from 'src/helpers/api.config.service';

@Injectable()
export class JwtAdminGuard implements CanActivate {
    constructor(private readonly configService: ApiConfigService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authorization: string = request.headers['authorization'];
        if (!authorization) {
            return false;
        }

        const jwt = authorization.replace('Bearer ', '');
        const admins = this.configService.getSecurityAdmins();
        try {
            const jwtSecret = process.env.JWT_SECRET;
            let user: any;
            await new Promise((resolve, reject) => {
                verify(jwt, jwtSecret, (err, decoded: JwtPayload) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(decoded);
                    user = decoded.user;
                });
            });
            if (!admins.includes(user.address)) {
                return false;
            }
        } catch (error) {
            throw new ForbiddenError(error.message);
        }

        return true;
    }
}
