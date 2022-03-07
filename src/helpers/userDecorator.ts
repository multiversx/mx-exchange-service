import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const User = createParamDecorator(
    (data: unknown, context: ExecutionContext) => {
        const ctx = GqlExecutionContext.create(context);
        const user = ctx.getContext().req.user;

        const cookies = ctx.getContext().cookies;

        if (cookies !== undefined) {
            user.publicKey = cookies['Impersonate-Address'];
        }

        return user;
    },
);
