import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { ForbiddenError } from 'apollo-server-express';

@Injectable()
export class JwtAuthenticateGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const authorization: string = context.getArgs()[2].req.headers[
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
            throw new ForbiddenError(error.message);
        }

        return true;
    }
}
