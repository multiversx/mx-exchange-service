import { Module } from '@nestjs/common';
import { CommonAppModule } from './common.app.module';
import { MetricsController } from './endpoints/metrics/metrics.controller';
import { PairModule } from './modules/pair/pair.module';
import { RemoteConfigController } from './modules/remote-config/remote-config.controller';
import { RemoteConfigModule } from './modules/remote-config/remote-config.module';
import { TokenController } from './modules/tokens/token.controller';
import { TokenModule } from './modules/tokens/token.module';
import { DynamicModuleUtils } from './utils/dynamic.module.utils';
import { ESTransactionsService } from './services/elastic-search/services/es.transactions.service';

@Module({
    imports: [
        CommonAppModule,
        PairModule,
        TokenModule,
        RemoteConfigModule,
        DynamicModuleUtils.getCacheModule(),
    ],
    controllers: [MetricsController, TokenController, RemoteConfigController],
    providers: [ESTransactionsService],
})
export class PrivateAppModule {}
