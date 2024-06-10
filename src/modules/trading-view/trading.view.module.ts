import { Module } from '@nestjs/common';
import { TradingViewController } from './trading.view.controller';

@Module({
    controllers: [TradingViewController],
})
export class TradingViewModule {}
