import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { DynamicModule, Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { FarmModule } from '../farm/farm.module';
import { PairModule } from '../pair/pair.module';
import { FarmHandlerService } from './handlers/farm.handler.service';
import { RabbitMQProxyHandlerService } from './rabbitmq.proxy.handler.service';
import { RabbitMqConsumer } from './rabbitmq.consumer';
import { RabbitMQEsdtTokenHandlerService } from './rabbitmq.esdtToken.handler.service';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { ContextModule } from 'src/services/context/context.module';
import { RouterModule } from '../router/router.module';
import { RouterHandlerService } from './handlers/router.handler.service';
import { RabbitMQMetabondingHandlerService } from './rabbitmq.metabonding.handler.service';
import { MetabondingModule } from '../metabonding/metabonding.module';
import { PriceDiscoveryEventHandler } from './handlers/price.discovery.handler.service';
import { PriceDiscoveryModule } from '../price-discovery/price.discovery.module';
import { TokenModule } from '../tokens/token.module';
import { LiquidityHandler } from './handlers/pair.liquidity.handler.service';
import { SwapEventHandler } from './handlers/pair.swap.handler.service';
import { AnalyticsModule as AnalyticsServicesModule } from 'src/services/analytics/analytics.module';
import { PairHandler } from './handlers/pair.handler.service';
import { EnergyHandler } from './handlers/energy.handler.service';
import { SimpleLockModule } from '../simple-lock/simple.lock.module';
import { FeesCollectorModule } from '../fees-collector/fees-collector.module';
import { FarmModuleV1_2 } from '../farm/v1.2/farm.v1.2.module';
import { FarmModuleV1_3 } from '../farm/v1.3/farm.v1.3.module';
import { EnergyModule } from '../energy/energy.module';
import { FeesCollectorHandlerService } from './handlers/feesCollector.handler.service';
import { WeeklyRewardsSplittingHandlerService } from './handlers/weeklyRewardsSplitting.handler.service';
import { UserModule } from '../user/user.module';
import { TokenUnstakeModule } from '../token-unstake/token.unstake.module';
import { TokenUnstakeHandlerService } from './handlers/token.unstake.handler.service';
import { WeeklyRewardsSplittingModule } from 'src/submodules/weekly-rewards-splitting/weekly-rewards-splitting.module';
import { EscrowHandlerService } from './handlers/escrow.handler.service';
import { EscrowModule } from '../escrow/escrow.module';
import { GovernanceHandlerService } from './handlers/governance.handler.service';
import { GovernanceModule } from '../governance/governance.module';
import { FarmModuleV2 } from '../farm/v2/farm.v2.module';
import { RemoteConfigModule } from '../remote-config/remote-config.module';
import { StakingHandlerService } from './handlers/staking.handler.service';
import { StakingModule } from '../staking/staking.module';

@Module({
    imports: [
        CommonAppModule,
        AnalyticsServicesModule,
        MXCommunicationModule,
        ContextModule,
        PairModule,
        FarmModule,
        FarmModuleV1_2,
        FarmModuleV1_3,
        FarmModuleV2,
        StakingModule,
        RouterModule,
        MetabondingModule,
        PriceDiscoveryModule,
        TokenModule,
        SimpleLockModule,
        FeesCollectorModule,
        EnergyModule,
        TokenUnstakeModule,
        UserModule,
        WeeklyRewardsSplittingModule,
        GovernanceModule,
        EscrowModule,
        RemoteConfigModule,
    ],
    providers: [
        RabbitMqConsumer,
        FarmHandlerService,
        RabbitMQProxyHandlerService,
        RouterHandlerService,
        RabbitMQEsdtTokenHandlerService,
        RabbitMQMetabondingHandlerService,
        PriceDiscoveryEventHandler,
        EnergyHandler,
        PairHandler,
        LiquidityHandler,
        SwapEventHandler,
        FeesCollectorHandlerService,
        TokenUnstakeHandlerService,
        WeeklyRewardsSplittingHandlerService,
        GovernanceHandlerService,
        EscrowHandlerService,
        StakingHandlerService,
    ],
})
export class RabbitMqModule {
    static register(): DynamicModule {
        return {
            module: RabbitMqModule,
            imports: [
                RabbitMQModule.forRootAsync(RabbitMQModule, {
                    useFactory: () => {
                        return {
                            name: process.env.RABBITMQ_EXCHANGE,
                            type: 'fanout',
                            options: {},
                            uri: process.env.RABBITMQ_URL,
                            prefetchCount: 1,
                        };
                    },
                }),
            ],
        };
    }
}
