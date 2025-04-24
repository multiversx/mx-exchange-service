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
}
bootstrap();
