import {
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';

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
