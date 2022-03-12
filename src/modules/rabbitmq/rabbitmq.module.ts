import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { DynamicModule, Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { FarmModule } from '../farm/farm.module';
import { PairModule } from '../pair/pair.module';
import { RabbitMQFarmHandlerService } from './rabbitmq.farm.handler.service';
import { RabbitMQPairHandlerService } from './rabbitmq.pair.handler.service';
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

@Module({
    imports: [
        CommonAppModule,
        ElrondCommunicationModule,
        CachingModule,
        ContextModule,
        PairModule,
        FarmModule,
        RouterModule,
        MetabondingModule,
    ],
    providers: [
        RabbitMqConsumer,
        RabbitMQPairHandlerService,
        RabbitMQFarmHandlerService,
        RabbitMQProxyHandlerService,
        RabbitMQRouterHandlerService,
        RabbitMQEsdtTokenHandlerService,
        RabbitMQMetabondingHandlerService,
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
