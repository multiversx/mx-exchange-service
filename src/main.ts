import { NestFactory } from '@nestjs/core';
import { BigNumber } from 'bignumber.js';
import { AppModule } from './app.module';

async function bootstrap() {
    BigNumber.config({ EXPONENTIAL_AT: [-18, 20] });
    const app = await NestFactory.create(AppModule);
    await app.listen(process.env.PORT);
}
bootstrap();
