import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { ForbiddenError } from 'apollo-server-errors';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
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
        return super.canActivate(new ExecutionContextHost([req]));
    }

    handleRequest(err: any, user: any, info: any) {
        if (!err && !!user) {
            this.logger.error('address', [{ user: user }]);
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
