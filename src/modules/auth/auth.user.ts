import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UserAuthResult } from './user.auth.result';

export const AuthUser = createParamDecorator((key, ctx: ExecutionContext): UserAuthResult => {
    let authUser: UserAuthResult = ctx.getArgs()[0]?.auth;
    if (!authUser) {
        const gqlCtx = GqlExecutionContext.create(ctx);
        authUser = gqlCtx.getContext().req?.auth;
    }

    if (!authUser) {
        return undefined;
    }

    if (key === undefined) {
        return authUser;
    }

    return authUser[key];
});
