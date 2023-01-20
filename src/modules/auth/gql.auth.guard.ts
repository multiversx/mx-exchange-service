import {
    ExecutionContext,
    ForbiddenException,
    HttpException,
    HttpStatus,
    Inject,
    Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
    private impersonateAddress: string;

    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        super();
    }
    canActivate(context: ExecutionContext) {
        const ctx = GqlExecutionContext.create(context);
        const { req } = ctx.getContext();
        const headers = req.headers;
        this.logger.info('request header', [
            {
                requestIP: req.ip, headers: {
                    'host': headers['host'],
                    'x-request-id': headers['x-request-id'],
                    'x-real-ip': headers['x-real-ip'],
                    'x-forwarded-for': headers['x-forwarded-for'],
                    'x-forwarded-host': headers['x-forwarded-host'],
                    'x-forwarded-port': headers['x-forwarded-port'],
                    'user-agent': headers['user-agent'],
                }
            },
        ]);

        if (headers !== undefined) {
            this.impersonateAddress = headers['impersonate-address'];
        }
        return super.canActivate(new ExecutionContextHost([req]));
    }

    handleRequest(err: any, user: any, info: any) {
        if (!err && !!user) {
            this.logger.info('address', [{ user: user }]);
            if (this.impersonateAddress) {
                const admins = process.env.SECURITY_ADMINS.split(',');
                if (admins.find(admin => admin === user.publicKey)) {
                    user.publicKey = this.impersonateAddress;
                }
            }
            return user;
        }

        if (info?.name === 'TokenExpiredError') {
            throw new ForbiddenException('token expired');
        }

        if (info?.name === 'JsonWebTokenError') {
            throw new ForbiddenException('invalid token');
        }

        throw new ForbiddenException(
            'You are not authorized to make this request',
        );
    }
}
