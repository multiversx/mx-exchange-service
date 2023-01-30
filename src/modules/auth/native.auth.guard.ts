import { NativeAuthServer } from '@multiversx/sdk-native-auth-server';
import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Inject,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { Logger } from 'winston';

@Injectable()
export class NativeAuthGuard implements CanActivate {
    private readonly authServer: NativeAuthServer;
    private impersonateAddress: string;

    constructor(
        apiConfigService: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.authServer = new NativeAuthServer({
            apiUrl: apiConfigService.getApiUrl(),
        });
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const ctx = GqlExecutionContext.create(context);
        const { req } = ctx.getContext();

        if (req.headers !== undefined) {
            this.impersonateAddress = req.headers['impersonate-address'];
        }

        const authorization: string = req.headers['authorization'];
        if (!authorization) {
            throw new UnauthorizedException();
        }
        const jwt = authorization.replace('Bearer ', '');

        try {
            const userInfo = await this.authServer.validate(jwt);

            req.res.set('X-Native-Auth-Issued', userInfo.issued);
            req.res.set('X-Native-Auth-Expires', userInfo.expires);
            req.res.set('X-Native-Auth-Address', userInfo.address);
            req.res.set(
                'X-Native-Auth-Timestamp',
                Math.round(new Date().getTime() / 1000),
            );

            if (this.impersonateAddress) {
                const admins = process.env.SECURITY_ADMINS.split(',');
                if (admins.find((admin) => admin === userInfo.address)) {
                    req.res.set(
                        'X-Native-Auth-Address',
                        this.impersonateAddress,
                    );
                    req.auth.address = this.impersonateAddress;
                }
            }

            req.auth = userInfo;

            return true;
        } catch (error: any) {
            this.logger.error(error);
            return false;
        }
    }
}
