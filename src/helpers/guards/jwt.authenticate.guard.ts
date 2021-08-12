import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { verify } from 'jsonwebtoken';

@Injectable()
export class JwtAuthenticateGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        const authorization: string = context.getArgs()[2].req.raw.headers[
            'authorization'
        ];
        if (!authorization) {
            return false;
        }

        const jwt = authorization.replace('Bearer ', '');

        try {
            const jwtSecret = process.env.JWT_SECRET;

            await new Promise((resolve, reject) => {
                verify(jwt, jwtSecret, (err, decoded) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(decoded.user);
                });
            });
        } catch (error) {
            console.error(error);
            return false;
        }

        return true;
    }
}
