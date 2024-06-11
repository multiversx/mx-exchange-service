import { Module } from '@nestjs/common';
import { TradingViewController } from './trading.view.controller';
import { TradingViewService } from './services/trading.view.service';

@Module({
    providers: [TradingViewService],
    controllers: [TradingViewController],
})
export class TradingViewModule {}
