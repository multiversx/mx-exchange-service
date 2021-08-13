import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { BigNumber } from 'bignumber.js';
import { PublicAppModule } from './public.app.module';
import { PrivateAppModule } from './private.app.module';
import { CacheWarmerModule } from './services/cache.warmer.module';
import { PubSubModule } from './services/pub.sub.module';
import { LoggingInterceptor } from './utils/logging.interceptor';

async function bootstrap() {
    BigNumber.config({ EXPONENTIAL_AT: [-30, 30] });

    const app = await NestFactory.create(PublicAppModule);

    app.useGlobalInterceptors(new LoggingInterceptor());

    await app.listen(parseInt(process.env.PORT), process.env.LISTEN_ADDRESS);

    if (process.env.ENABLE_PRIVATE_API === 'true') {
        const privateApp = await NestFactory.create(PrivateAppModule);
        await privateApp.listen(
            parseInt(process.env.PRIVATE_PORT),
            process.env.PRIVATE_LISTEN_ADDRESS,
        );
    }
    if (process.env.ENABLE_CACHE_WARMER === 'true') {
        const processorApp = await NestFactory.create(CacheWarmerModule);
        await processorApp.listen(
            parseInt(process.env.CRON_PORT),
            process.env.LISTEN_ADDRESS,
        );
    }

    const pubSubApp = await NestFactory.createMicroservice<MicroserviceOptions>(
        PubSubModule,
        {
            transport: Transport.REDIS,
            options: {
                url: `redis://${process.env.REDIS_URL}:${parseInt(
                    process.env.REDIS_PORT,
                )}`,
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
