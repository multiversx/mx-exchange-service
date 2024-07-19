import { Module } from '@nestjs/common';
import { TradingViewController } from './trading.view.controller';
import { TradingViewService } from './services/trading.view.service';
import { TokenModule } from '../tokens/token.module';
import { RouterModule } from '../router/router.module';
import { PairModule } from '../pair/pair.module';

@Module({
    imports: [TokenModule, RouterModule, PairModule],
    providers: [TradingViewService],
    controllers: [TradingViewController],
})
export class TradingViewModule {}
