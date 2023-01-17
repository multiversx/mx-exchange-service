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

@Injectable()
export class GqlAuthGuard implements CanActivate {
    private impersonateAddress: string;

    constructor(
        private readonly apiConfigService: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const ctx = GqlExecutionContext.create(context);
        const { req } = ctx.getContext();
        this.logger.info('request header', [
            { requestIP: req.ip, request: req.headers },
        ]);

        if (req.headers !== undefined) {
            this.impersonateAddress = req.headers['impersonate-address'];
        }

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

                    req.auth = {
                        address: decoded.sub,
                        expires: decoded.exp,
                        issued: decoded.iat,
                        host: decoded.iss,
                    };
                    if (this.impersonateAddress) {
                        const admins = process.env.SECURITY_ADMINS.split(',');
                        if (
                            admins.find((admin) => admin === req.auth.address)
                        ) {
                            req.auth.address = this.impersonateAddress;
                        }
                    }
                    resolve(req.auth);
                });
            });
        } catch (error) {
            this.logger.error(error);
            return false;
        }

        return true;
    }
}
