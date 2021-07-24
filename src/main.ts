import { NestFactory } from '@nestjs/core';
import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { BigNumber } from 'bignumber.js';
import { AppModule } from './app.module';
import { PrivateAppModule } from './private.app.module';
import { CacheWarmerModule } from './services/cache.warmer.module';

async function bootstrap() {
    BigNumber.config({ EXPONENTIAL_AT: [-30, 30] });

    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter(),
    );
    await app.listen(parseInt(process.env.PORT), process.env.LISTEN_ADDRESS);

    if (process.env.ENABLE_PRIVATE_API === 'true') {
        const privateApp = await NestFactory.create<NestFastifyApplication>(
            PrivateAppModule,
            new FastifyAdapter(),
        );
        await privateApp.listen(
            parseInt(process.env.PRIVATE_PORT),
            process.env.PRIVATE_LISTEN_ADDRESS,
        );
    }
    if (process.env.ENABLE_CACHE_WARMER === 'true') {
        const processorApp = await NestFactory.create<NestFastifyApplication>(
            CacheWarmerModule,
            new FastifyAdapter(),
        );
        await processorApp.listen(
            parseInt(process.env.CRON_PORT),
            process.env.LISTEN_ADDRESS,
        );
    }
}
bootstrap();
