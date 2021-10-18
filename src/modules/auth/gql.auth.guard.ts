import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { ForbiddenError } from 'apollo-server-errors';

@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        const ctx = GqlExecutionContext.create(context);
        const { req } = ctx.getContext();
        return super.canActivate(new ExecutionContextHost([req]));
    }

    handleRequest(err: any, user: any, info: any) {
        if (!err && !!user) {
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
