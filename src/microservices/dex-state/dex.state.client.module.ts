import { Module } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { DEX_STATE_PACKAGE_NAME } from './interfaces/dex_state.interfaces';

export const DEX_STATE_CLIENT = 'DEX_STATE_CLIENT';

@Module({
    providers: [
        {
            provide: DEX_STATE_CLIENT,
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.GRPC,
                    options: {
                        package: DEX_STATE_PACKAGE_NAME,
                        protoPath: join(
                            __dirname,
                            '../../proto/dex_state.proto',
                        ),
                        url: 'localhost:5000',
                    },
                });
            },
        },
    ],
    exports: [DEX_STATE_CLIENT],
})
export class DexStateClientModule {}
