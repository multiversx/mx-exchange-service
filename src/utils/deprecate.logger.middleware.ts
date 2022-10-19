import { FieldMiddleware, MiddlewareContext, NextFn } from '@nestjs/graphql';

export const deprecationLoggerMiddleware: FieldMiddleware = async (
    ctx: MiddlewareContext,
    next: NextFn,
) => {
    const value = await next();
    const { context } = ctx;
    const request = context.req;
    const fieldConfig = ctx.info.parentType.getFields()[ctx.info.fieldName];
    if (fieldConfig.deprecationReason) {
        const { name, description, deprecationReason } = fieldConfig;
        const deprecateWarning = {
            name,
            description,
            deprecationReason,
        };
        request.deprecationWarning = [
            ...(request?.deprecationWarning || []),
            deprecateWarning,
        ];
    }
    return value;
};
