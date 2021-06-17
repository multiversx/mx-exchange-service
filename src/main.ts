import { NestFactory } from '@nestjs/core';
import { BigNumber } from 'bignumber.js';
import { AppModule } from './app.module';
import { cronConfig } from './config';
import { CacheWarmerModule } from './services/cache.warmer.module';

async function bootstrap() {
    BigNumber.config({ EXPONENTIAL_AT: [-30, 30] });

    const app = await NestFactory.create(AppModule);
    await app.listen(process.env.PORT);

    if (cronConfig.cacheWarmer) {
        const processorApp = await NestFactory.create(CacheWarmerModule);
        await processorApp.listen(process.env.CRON_PORT);
    }
}
bootstrap();
