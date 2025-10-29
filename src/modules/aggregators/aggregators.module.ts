import { Module } from '@nestjs/common';
import { TradingViewController } from './controllers/trading.view.controller';
import { TradingViewService } from './services/trading.view.service';
import { TokenModule } from '../tokens/token.module';
import { RouterModule } from '../router/router.module';
import { PairModule } from '../pair/pair.module';
import { CoinGeckoService } from './services/coin.gecko.service';
import { CoinGeckoController } from './controllers/coin.gecko.controller';
import { EnergyModule } from '../energy/energy.module';
import { MexService } from './services/mex.service';
import { MexAnalyticsController } from './controllers/mex.analytics.controller';

@Module({
    imports: [TokenModule, RouterModule, PairModule, EnergyModule],
    providers: [TradingViewService, CoinGeckoService, MexService],
    controllers: [
        TradingViewController,
        CoinGeckoController,
        MexAnalyticsController,
    ],
})
export class AggregatorsModule {}
