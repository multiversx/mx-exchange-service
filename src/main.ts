import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { BigNumber } from 'bignumber.js';
import { PublicAppModule } from './public.app.module';
import { PrivateAppModule } from './private.app.module';
import { CacheWarmerModule } from './services/cache.warmer.module';
import { PubSubModule } from './services/pub.sub.module';
import { LoggingInterceptor } from './utils/logging.interceptor';
import { ApiConfigService } from './helpers/api.config.service';
import { WebSocketModule } from './modules/websocket/websocket.module';

async function bootstrap() {
    BigNumber.config({ EXPONENTIAL_AT: [-30, 30] });

    const app = await NestFactory.create(PublicAppModule);

    app.useGlobalInterceptors(new LoggingInterceptor());
    const apiConfigService = app.get<ApiConfigService>(ApiConfigService);

    await app.listen(
        apiConfigService.getPublicAppPort(),
        apiConfigService.getPublicAppListenAddress(),
    );

    if (apiConfigService.isPrivateAppActive()) {
        const privateApp = await NestFactory.create(PrivateAppModule);
        await privateApp.listen(
            apiConfigService.getPrivateAppPort(),
            apiConfigService.getPrivateAppListenAddress(),
        );
    }
    if (apiConfigService.isCacheWarmerCronActive()) {
        const processorApp = await NestFactory.create(CacheWarmerModule);
        await processorApp.listen(
            apiConfigService.getCacheWarmerPort(),
            apiConfigService.getPublicAppListenAddress(),
        );
    }

    const eventsApp = await NestFactory.createMicroservice<MicroserviceOptions>(
        WebSocketModule,
        {
            transport: Transport.REDIS,
            options: {
                url: `redis://${apiConfigService.getRedisUrl()}:${apiConfigService.getRedisPort()}`,
                retryDelay: 1000,
                retryAttempts: 10,
                retry_strategy: function(_: any) {
                    return 1000;
                },
            },
        },
    );
    eventsApp.listen(() => console.log('Started events microservice'));

    const pubSubApp = await NestFactory.createMicroservice<MicroserviceOptions>(
        PubSubModule,
        {
            transport: Transport.REDIS,
            options: {
                url: `redis://${apiConfigService.getRedisUrl()}:${apiConfigService.getRedisPort()}`,
                retryDelay: 1000,
                retryAttempts: 10,
                retry_strategy: function(_: any) {
                    return 1000;
                },
            },
        },
    );
    pubSubApp.listen(() => console.log('Started Redis pub/sub microservice'));
}
bootstrap();
