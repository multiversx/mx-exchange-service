import { NestFactory } from '@nestjs/core';
import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { BigNumber } from 'bignumber.js';
import { AppModule } from './app.module';
import { cronConfig } from './config';
import { CacheWarmerModule } from './services/cache.warmer.module';

async function bootstrap() {
    BigNumber.config({ EXPONENTIAL_AT: [-30, 30] });

    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter(),
    );
    await app.listen(parseInt(process.env.PORT));

    if (cronConfig.cacheWarmer) {
        const processorApp = await NestFactory.create<NestFastifyApplication>(
            CacheWarmerModule,
            new FastifyAdapter(),
        );
        await processorApp.listen(parseInt(process.env.CRON_PORT));
    }
}
bootstrap();
