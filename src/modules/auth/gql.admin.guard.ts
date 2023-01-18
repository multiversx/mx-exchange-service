import {
    CanActivate,
    ExecutionContext,
    Inject,
    Injectable,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { JwtPayload, verify } from 'jsonwebtoken';
import { ForbiddenError } from 'apollo-server-express';

@Injectable()
export class GqlAdminGuard implements CanActivate {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly apiConfigService: ApiConfigService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const ctx = GqlExecutionContext.create(context);
        const { req } = ctx.getContext();
        this.logger.error('request header', [
            { requestIP: req.ip, request: req.headers },
        ]);

        const authorization: string = req.headers['authorization'];
        if (!authorization) {
            return false;
        }
        const jwt = authorization.replace('Bearer ', '');

        try {
            const jwtSecret = this.apiConfigService.getJwtSecret();

            req.jwt = await new Promise((resolve, reject) => {
                verify(jwt, jwtSecret, (err, decoded: JwtPayload) => {
                    if (err) {
                        reject(err);
                    }

                    const admins = this.apiConfigService.getSecurityAdmins();
                    if (!admins.includes(decoded.sub)) {
                        console.log({
                            address: decoded.sub,
                        });
                        throw new ForbiddenError(
                            'You are not authorized to make this request',
                        );
                    }

                    req.auth = {
                        address: decoded.sub,
                        expires: decoded.exp,
                        issued: decoded.iat,
                        host: decoded.iss,
                    };

                    resolve(req.auth);
                });
            });
        } catch (error) {
            if (error.extensions.code === 'FORBIDDEN') {
                this.logger.error(error.message, error.extensions);
            } else {
                this.logger.error(error);
            }
            return false;
        }

        return true;
    }
}
