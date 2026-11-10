import {
    DynamicModule,
    LoggerService,
    MiddlewareConsumer,
    RequestMethod,
} from '@nestjs/common';
import { ApolloDriverConfig } from '@nestjs/apollo';
import { ConditionalModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import {
    ExecutionResult,
    FormattedExecutionResult,
    GraphQLError,
    GraphQLFormattedError,
} from 'graphql';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CommonAppModule } from 'src/common.app.module';
import { ComplexityModule } from 'src/complexity.module';
import { ApiConfigService } from 'src/helpers/api.config.service';
import {
    apolloDriverWithWsMaxPayload,
    graphqlParseOptions,
    onWsSubscribe,
} from './graphql.limits';
import { GuestCachingMiddleware } from './guestCaching.middleware';
import { requestIdMiddleware } from './request.id';

// Shared by the public app and the edge harness, so tests match production.

const WS_MAX_PAYLOAD_BYTES = 64 * 1024;

export function publicGraphQLModule(): DynamicModule {
    return GraphQLModule.forRootAsync<ApolloDriverConfig>({
        driver: apolloDriverWithWsMaxPayload(WS_MAX_PAYLOAD_BYTES),
        imports: [CommonAppModule],
        useFactory: buildPublicGraphQLOptions,
        inject: [WINSTON_MODULE_NEST_PROVIDER, ApiConfigService],
    });
}

export function publicComplexityModule(): Promise<DynamicModule> {
    return ConditionalModule.registerWhen(
        ComplexityModule,
        (env: NodeJS.ProcessEnv) => env['ENABLE_COMPLEXITY'] === 'true',
    );
}

function buildPublicGraphQLOptions(
    logger: LoggerService,
    apiConfig: ApiConfigService,
): Omit<ApolloDriverConfig, 'driver'> {
    return {
        // Built in memory, so the service runs on a read-only filesystem.
        autoSchemaFile: true,
        subscriptions: {
            'graphql-ws': {
                path: '/graphql',
                onSubscribe: onWsSubscribe,
                ...wsErrorMasking(logger),
            },
        },
        context: async (contextData: any) => ({
            req: contextData.req ?? contextData.extra?.request,
        }),
        parseOptions: graphqlParseOptions,
        formatError: (
            formattedError: GraphQLFormattedError,
            error: any,
        ): GraphQLFormattedError =>
            maskInternalError(formattedError, error, logger),
        fieldResolverEnhancers: ['guards'],
        playground: apiConfig.isGraphqlPlaygroundEnabled(),
    };
}

// Internal and uncoded errors get a generic message; the original is logged.
function maskInternalError(
    formattedError: GraphQLFormattedError,
    error: any,
    logger: LoggerService,
): GraphQLFormattedError {
    const errorStatus = formattedError.extensions?.code;
    switch (errorStatus) {
        case 'FORBIDDEN':
            logger.log(error.message, 'GraphQLModule');
            break;
        case undefined:
        case ApolloServerErrorCode.INTERNAL_SERVER_ERROR:
            logger.error(
                `${error?.message ?? formattedError.message} at ${
                    formattedError.path?.join('.') ?? 'unknown path'
                }`,
                undefined,
                'GraphQLModule',
            );
            return {
                message: 'Internal server error',
                path: formattedError.path,
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            };
    }

    return {
        message: formattedError.message,
        path: formattedError.path,
        extensions: {
            code: errorStatus,
        },
    };
}

// Masks subscription errors, which graphql-ws sends without formatError.
function wsErrorMasking(logger: LoggerService) {
    return {
        onNext: (
            _ctx: unknown,
            _id: string,
            _payload: unknown,
            _args: unknown,
            result: ExecutionResult | FormattedExecutionResult,
        ): FormattedExecutionResult | undefined => {
            if (!result.errors?.length) {
                return undefined;
            }
            return {
                ...result,
                errors: result.errors.map((error) =>
                    maskInternalError(
                        error instanceof GraphQLError ? error.toJSON() : error,
                        error,
                        logger,
                    ),
                ),
            };
        },
        // Stream failures only; Nest's type omits onError but passes it on.
        onError: (
            _ctx: unknown,
            _id: string,
            _payload: unknown,
            errors: readonly GraphQLError[],
        ): GraphQLFormattedError[] | undefined => {
            if (!errors.some((error) => error.originalError)) {
                return undefined;
            }
            return errors.map((error) =>
                error.originalError
                    ? maskInternalError(error.toJSON(), error, logger)
                    : error.toJSON(),
            );
        },
    };
}

export function configurePublicHttpPipeline(app: NestExpressApplication): void {
    // Before body parsing, so rejected bodies still get these headers.
    app.use(requestIdMiddleware);
    app.use(helmet({ contentSecurityPolicy: false }));
    // Any origin: auth uses the Authorization header, never cookies.
    app.enableCors({
        origin: '*',
    });
    app.useBodyParser('json', { limit: '1mb' });
}

export function applyPublicEdgeMiddleware(consumer: MiddlewareConsumer): void {
    consumer
        .apply(GuestCachingMiddleware)
        .forRoutes({ path: 'graphql', method: RequestMethod.POST });
}
