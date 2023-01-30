import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { DynamicModule, Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { FarmModule } from '../farm/farm.module';
import { PairModule } from '../pair/pair.module';
import { RabbitMQFarmHandlerService } from './rabbitmq.farm.handler.service';
import { RabbitMQProxyHandlerService } from './rabbitmq.proxy.handler.service';
import { RabbitMqConsumer } from './rabbitmq.consumer';
import { RabbitMQEsdtTokenHandlerService } from './rabbitmq.esdtToken.handler.service';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { RouterModule } from '../router/router.module';
import { RabbitMQRouterHandlerService } from './rabbitmq.router.handler.service';
import { RabbitMQMetabondingHandlerService } from './rabbitmq.metabonding.handler.service';
import { MetabondingModule } from '../metabonding/metabonding.module';
import { PriceDiscoveryEventHandler } from './handlers/price.discovery.handler.service';
import { PriceDiscoveryModule } from '../price-discovery/price.discovery.module';
import { TokenModule } from '../tokens/token.module';
import { LiquidityHandler } from './handlers/pair.liquidity.handler.service';
import { SwapEventHandler } from './handlers/pair.swap.handler.service';
import { AWSModule } from 'src/services/aws/aws.module';
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

@Module({
    imports: [
        CommonAppModule,
        MXCommunicationModule,
        AWSModule,
        CachingModule,
        ContextModule,
        PairModule,
        FarmModule,
        FarmModuleV1_2,
        FarmModuleV1_3,
        RouterModule,
        MetabondingModule,
        PriceDiscoveryModule,
        TokenModule,
        SimpleLockModule,
        FeesCollectorModule,
        EnergyModule,
        TokenUnstakeModule,
        UserModule,
    ],
    providers: [
        RabbitMqConsumer,
        RabbitMQFarmHandlerService,
        RabbitMQProxyHandlerService,
        RabbitMQRouterHandlerService,
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
                        };
                    },
                }),
            ],
        };
    }
}
