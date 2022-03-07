import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { ForbiddenError } from 'apollo-server-errors';
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
        this.logger.error('request header', [
            { requestIP: req.ip, request: req.headers },
        ]);

        const cookies = ctx.getContext().cookies;

        if (cookies !== undefined) {
            this.impersonateAddress = cookies['Impersonate-Address'];
        }
        return super.canActivate(new ExecutionContextHost([req]));
    }

    handleRequest(err: any, user: any, info: any) {
        if (!err && !!user) {
            this.logger.error('address', [{ user: user }]);
            if (this.impersonateAddress) {
                console.log(this.impersonateAddress);
                const admins = process.env.SECURITY_ADMINS.split(',');
                if (admins.find(admin => admin === user.publicKey)) {
                    user.publicKey = this.impersonateAddress;
                }
            }
            return user;
        }

        if (info?.name === 'TokenExpiredError') {
            throw new ForbiddenError('token expired');
        }

        if (info?.name === 'JsonWebTokenError') {
            throw new ForbiddenError('invalid token');
        }

        throw new ForbiddenError('You are not authorized to make this request');
    }
}
