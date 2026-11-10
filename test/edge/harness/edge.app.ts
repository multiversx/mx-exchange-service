import { MiddlewareConsumer, Module } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { AddressInfo } from 'net';
import { Writable } from 'stream';
import request from 'supertest';
import * as winston from 'winston';
import { CommonAppModule } from 'src/common.app.module';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { jsonLogFormat } from 'src/utils/logger.formats';
import {
    applyPublicEdgeMiddleware,
    configurePublicHttpPipeline,
    publicComplexityModule,
    publicGraphQLModule,
} from 'src/utils/public.edge';
import { QueryMetricsPlugin } from 'src/utils/query.metrics.plugin';
import { EdgeStubModule, STUB_EVENT } from './stub.module';

// The public edge around a stub schema; no domain modules are imported.
@Module({
    imports: [
        CommonAppModule,
        publicGraphQLModule(),
        DynamicModuleUtils.getCacheModule(),
        publicComplexityModule(),
        EdgeStubModule,
    ],
    providers: [QueryMetricsPlugin],
})
class EdgeAppModule {
    configure(consumer: MiddlewareConsumer) {
        applyPublicEdgeMiddleware(consumer);
    }
}

export interface EdgeApp {
    app: NestExpressApplication;
    wsUrl: string;
    redis: Redis;
    captureLogs: (action: () => Promise<unknown>) => Promise<LogEntry[]>;
    http: () => ReturnType<typeof request>;
    publish: (value: string) => Promise<void>;
    close: () => Promise<void>;
}

// Boots the edge on a random port; `env` is restored on close or failed start.
export async function createEdgeApp(
    env: Record<string, string> = {},
): Promise<EdgeApp> {
    const previousEnv = overrideEnv(env);

    let app: NestExpressApplication;
    try {
        app = await startEdge();
    } catch (error) {
        overrideEnv(previousEnv);
        throw error;
    }

    const { port } = app.getHttpServer().address() as AddressInfo;
    const apiConfig = app.get(ApiConfigService);
    const redis = new Redis({
        host: apiConfig.getRedisUrl(),
        port: Number(apiConfig.getRedisPort()),
    });
    const pubSub = app.get<RedisPubSub>(PUB_SUB);

    return {
        app,
        wsUrl: `ws://127.0.0.1:${port}/graphql`,
        redis,
        captureLogs: (action) =>
            captureLogs(
                app.get<winston.Logger>(WINSTON_MODULE_PROVIDER),
                action,
            ),
        http: () => request(app.getHttpServer()),
        publish: (value: string) =>
            pubSub.publish(STUB_EVENT, { [STUB_EVENT]: value }),
        close: async () => {
            await app.close();
            pubSub.close();
            redis.disconnect();
            overrideEnv(previousEnv);
        },
    };
}

export type LogEntry = Record<string, unknown>;

// Runs `action` and returns the JSON log entries written meanwhile.
async function captureLogs(
    logger: winston.Logger,
    action: () => Promise<unknown>,
): Promise<LogEntry[]> {
    const lines: string[] = [];
    const capture = new winston.transports.Stream({
        format: jsonLogFormat(),
        stream: new Writable({
            write(chunk, _encoding, callback) {
                lines.push(chunk.toString());
                callback();
            },
        }),
    });
    logger.add(capture);
    try {
        await action();
        await new Promise((resolve) => setImmediate(resolve));
    } finally {
        logger.remove(capture);
    }
    return lines.map((line) => JSON.parse(line));
}

async function startEdge(): Promise<NestExpressApplication> {
    const moduleRef = await Test.createTestingModule({
        imports: [EdgeAppModule],
    }).compile();
    const app = moduleRef.createNestApplication<NestExpressApplication>({
        logger: false,
    });
    configurePublicHttpPipeline(app);
    try {
        await app.listen(0, '127.0.0.1');
    } catch (error) {
        await app.close().catch(() => undefined);
        throw error;
    }
    return app;
}

function overrideEnv(
    env: Record<string, string | undefined>,
): Record<string, string | undefined> {
    const previous: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(env)) {
        previous[key] = process.env[key];
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
    return previous;
}

export function graphqlRequest(
    edge: EdgeApp,
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
) {
    return edge.http().post('/graphql').set(headers).send(body);
}
