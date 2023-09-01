import {
    CanActivate,
    ExecutionContext,
    Inject,
    Injectable,
    Logger,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { JwtPayload, verify } from 'jsonwebtoken';
import { ForbiddenError } from '@nestjs/apollo';

@Injectable()
export class GqlAdminGuard implements CanActivate {
    constructor(
        @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
        private readonly apiConfigService: ApiConfigService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const ctx = GqlExecutionContext.create(context);
        const { req } = ctx.getContext();
        this.logger.log(
            `request header: requestIP: ${req.ip}, request: ${JSON.stringify(
                req.headers,
            )}`,
            GqlAdminGuard.name,
        );

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
            this.logger.warn(error.message, GqlAdminGuard.name);
            return false;
        }

        return true;
    }
}
