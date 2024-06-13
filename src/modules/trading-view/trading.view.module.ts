import { Module } from '@nestjs/common';
import { TradingViewController } from './trading.view.controller';
import { TradingViewService } from './services/trading.view.service';
import { TokenModule } from '../tokens/token.module';

@Module({
    imports: [TokenModule],
    providers: [TradingViewService],
    controllers: [TradingViewController],
})
export class TradingViewModule {}
