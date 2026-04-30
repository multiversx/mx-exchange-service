import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { BigNumber } from 'bignumber.js';
import { PublicAppModule } from './public.app.module';
import { PrivateAppModule } from './private.app.module';
import { CacheWarmerModule } from './services/cache.warmer.module';
import { PubSubModule } from './services/pub.sub.module';
import { LoggingInterceptor } from './utils/logging.interceptor';
import { ApiConfigService } from './helpers/api.config.service';
import { RabbitMqProcessorModule } from './rabbitmq.processor.module';
import { RabbitMqConsumer } from './modules/rabbitmq/rabbitmq.consumer';
import cookieParser from 'cookie-parser';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LoggerService } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { PushNotificationsCronModule } from './modules/push-notifications/push.notifications.cron.module';
import { TaskRunnerPubSubModule } from './modules/task-runner/task.runner.pubsub.module';
import { TaskRunnerCronModule } from './modules/task-runner/task.runner.cron.module';
import { DexStateAppModule } from './microservices/dex-state/dex.state.app.module';
import { DEX_STATE_PACKAGE_NAME } from './microservices/dex-state/interfaces/dex_state.interfaces';
import { join } from 'path';
import { ReflectionService } from '@grpc/reflection';

async function bootstrap() {
    BigNumber.config({ EXPONENTIAL_AT: [-30, 30] });

    const app = await NestFactory.create<NestExpressApplication>(
        PublicAppModule,
        {
            bufferLogs: true,
        },
    );
    app.useLogger(app.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER));
    app.useBodyParser('json', { limit: '1mb' });

    const httpAdapterHostService = app.get<HttpAdapterHost>(HttpAdapterHost);

    app.useGlobalInterceptors(new LoggingInterceptor());

    app.use(cookieParser());
    const apiConfigService = app.get<ApiConfigService>(ApiConfigService);
    const httpServer = httpAdapterHostService.httpAdapter.getHttpServer();

    httpServer.keepAliveTimeout =
        apiConfigService.getKeepAliveTimeoutUpstream();
    httpServer.headersTimeout = apiConfigService.getKeepAliveTimeoutUpstream(); //`keepAliveTimeout + server's expected response time`

    const pubSubApp = await NestFactory.createMicroservice<MicroserviceOptions>(
        PubSubModule,
        {
            transport: Transport.REDIS,
            options: {
                host: apiConfigService.getRedisUrl(),
                port: apiConfigService.getRedisPort(),
                retryDelay: 1000,
                retryAttempts: 10,
                retryStrategy: () => 1000,
            },
        },
    );

    if (apiConfigService.isPublicApiActive()) {
        pubSubApp.listen();

        app.enableCors({
            origin: '*',
        });

        await app.listen(
            apiConfigService.getPublicAppPort(),
            apiConfigService.getPublicAppListenAddress(),
        );
    }

    if (apiConfigService.isPrivateAppActive()) {
        const privateApp = await NestFactory.create(PrivateAppModule);
        await privateApp.listen(
            apiConfigService.getPrivateAppPort(),
            apiConfigService.getPrivateAppListenAddress(),
        );
    }
    if (apiConfigService.isCacheWarmerCronActive()) {
        pubSubApp.listen();
        const processorApp = await NestFactory.create(CacheWarmerModule);
        await processorApp.listen(
            apiConfigService.getCacheWarmerPort(),
            apiConfigService.getPublicAppListenAddress(),
        );
    }

    if (apiConfigService.isEventsNotifierAppActive()) {
        const eventsNotifierApp = await NestFactory.create(
            RabbitMqProcessorModule,
        );
        const rabbitMqService =
            eventsNotifierApp.get<RabbitMqConsumer>(RabbitMqConsumer);
        await rabbitMqService.getFilterAddresses();
        await eventsNotifierApp.listen(5673, '0.0.0.0');
    }

    if (apiConfigService.isNotificationsModuleActive()) {
        const pushNotificationsApp = await NestFactory.create(
            PushNotificationsCronModule,
        );
        await pushNotificationsApp.listen(5674, '0.0.0.0');
    }

    if (apiConfigService.isTaskRunnerModuleActive()) {
        const taskRunnerPubSub =
            await NestFactory.createMicroservice<MicroserviceOptions>(
                TaskRunnerPubSubModule,
                {
                    transport: Transport.REDIS,
                    options: {
                        host: apiConfigService.getRedisUrl(),
                        port: apiConfigService.getRedisPort(),
                        retryDelay: 1000,
                        retryAttempts: 10,
                        retryStrategy: () => 1000,
                    },
                },
            );

        pubSubApp.listen();
        taskRunnerPubSub.listen();

        const taskRunnerApp = await NestFactory.create(TaskRunnerCronModule);
        await taskRunnerApp.listen(5675, '0.0.0.0');
    }

    if (apiConfigService.isStateMicroserviceActive()) {
        const stateMicroservice =
            await NestFactory.createMicroservice<MicroserviceOptions>(
                DexStateAppModule,
                {
                    transport: Transport.GRPC,
                    options: {
                        package: DEX_STATE_PACKAGE_NAME,
                        protoPath: join(__dirname, 'proto/dex_state.proto'),
                        url: apiConfigService.getStateMicroserviceServerUrl(),
                        loader: {
                            arrays: true,
                        },
                        onLoadPackageDefinition: (pkg, server) => {
                            new ReflectionService(pkg).addToServer(server);
                        },
                    },
                },
            );

        await stateMicroservice.listen();
    }
}
bootstrap();
