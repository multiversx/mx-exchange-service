import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { DynamicModule, Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { FarmModule } from '../farm/farm.module';
import { PairModule } from '../pair/pair.module';
import { RabbitMQFarmHandlerService } from './rabbitmq.farm.handler.service';
import { RabbitMQProxyHandlerService } from './rabbitmq.proxy.handler.service';
import { RabbitMqConsumer } from './rabbitmq.consumer';
import { RabbitMQEsdtTokenHandlerService } from './rabbitmq.esdtToken.handler.service';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
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

@Module({
    imports: [
        CommonAppModule,
        ElrondCommunicationModule,
        AWSModule,
        CachingModule,
        ContextModule,
        PairModule,
        FarmModule,
        RouterModule,
        MetabondingModule,
        PriceDiscoveryModule,
        TokenModule,
        SimpleLockModule,
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
