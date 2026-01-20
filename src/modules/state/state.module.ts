import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { CommonAppModule } from 'src/common.app.module';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { DEX_STATE_PACKAGE_NAME } from 'src/microservices/dex-state/interfaces/dex_state.interfaces';
import { FarmsStateClient } from './services/client/farms.state.client';
import { FeesCollectorStateClient } from './services/client/fees.collector.state.client';
import { PairsStateClient } from './services/client/pairs.state.client';
import { StakingStateClient } from './services/client/staking.state.client';
import { TokensStateClient } from './services/client/tokens.state.client';
import { StateClient } from './services/state.client';

export const DEX_STATE_CLIENT = 'DEX_STATE_CLIENT';
@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                imports: [CommonAppModule],
                name: DEX_STATE_CLIENT,
                useFactory: async (configService: ApiConfigService) => ({
                    transport: Transport.GRPC,
                    options: {
                        package: DEX_STATE_PACKAGE_NAME,
                        protoPath: join(
                            __dirname,
                            '../../proto/dex_state.proto',
                        ),
                        url: configService.getStateMicroserviceClientUrl(),
                    },
                }),
                inject: [ApiConfigService],
            },
        ]),
    ],
    providers: [
        StateClient,
        TokensStateClient,
        PairsStateClient,
        FarmsStateClient,
        StakingStateClient,
        FeesCollectorStateClient,
    ],
    exports: [
        StateClient,
        TokensStateClient,
        PairsStateClient,
        FarmsStateClient,
        StakingStateClient,
        FeesCollectorStateClient,
    ],
})
export class StateModule {}
