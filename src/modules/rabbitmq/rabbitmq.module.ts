import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { DynamicModule, Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { ContextModule } from 'src/services/context/context.module';
import { FarmModule } from '../farm/farm.module';
import { PairModule } from '../pair/pair.module';
import { RabbitMQFarmHandlerService } from './rabbitmq.farm.handler.service';
import { RabbitMQPairHandlerService } from './rabbitmq.pair.handler.service';
import { RabbitMQProxyHandlerService } from './rabbitmq.proxy.handler.service';
import { RabbitMqConsumer } from './rabbitmq.consumer';

@Module({
    imports: [CommonAppModule, ContextModule, PairModule, FarmModule],
    providers: [
        RabbitMqConsumer,
        RabbitMQPairHandlerService,
        RabbitMQFarmHandlerService,
        RabbitMQProxyHandlerService,
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
