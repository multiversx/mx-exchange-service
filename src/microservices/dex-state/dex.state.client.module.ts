import { Module } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { CommonAppModule } from 'src/common.app.module';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { DEX_STATE_PACKAGE_NAME } from './interfaces/dex_state.interfaces';

export const DEX_STATE_CLIENT = 'DEX_STATE_CLIENT';

@Module({
    imports: [CommonAppModule],
    providers: [
        {
            provide: DEX_STATE_CLIENT,
            useFactory: (configService: ApiConfigService) => {
                return ClientProxyFactory.create({
                    transport: Transport.GRPC,
                    options: {
                        package: DEX_STATE_PACKAGE_NAME,
                        protoPath: join(
                            __dirname,
                            '../../proto/dex_state.proto',
                        ),
                        url: configService.getStateMicroserviceClientUrl(),
                    },
                });
            },
            inject: [ApiConfigService],
        },
    ],
    exports: [DEX_STATE_CLIENT],
})
export class DexStateClientModule {}
