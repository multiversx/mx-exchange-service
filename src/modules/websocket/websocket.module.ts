import { Module } from '@nestjs/common';
import {
    ClientOptions,
    ClientProxyFactory,
    Transport,
} from '@nestjs/microservices';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { PairModule } from '../pair/pair.module';
import { WebSocketService } from './websocket.service';

@Module({
    imports: [CommonAppModule, CachingModule, PairModule],
    providers: [
        WebSocketService,
        {
            provide: 'PUBSUB_SERVICE',
            useFactory: () => {
                const clientOptions: ClientOptions = {
                    transport: Transport.REDIS,
                    options: {
                        url: `redis://${process.env.REDIS_URL}:${parseInt(
                            process.env.REDIS_PORT,
                        )}`,
                        retryDelay: 1000,
                        retryAttempts: 10,
                        retry_strategy: function(_: any) {
                            return 1000;
                        },
                    },
                };
                return ClientProxyFactory.create(clientOptions);
            },
        },
    ],
    exports: [],
})
export class WebSocketModule {}
