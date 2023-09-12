import { Module } from '@nestjs/common';
import { PairModule } from 'src/modules/pair/pair.module';
import { ProxyPairAbiService } from './proxy.pair.abi.service';
import { ProxyPairTransactionsService } from './proxy.pair.transactions.service';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { WrappingModule } from 'src/modules/wrapping/wrap.module';
import { TokenModule } from 'src/modules/tokens/token.module';
import { CommonAppModule } from 'src/common.app.module';
import { ProxyModuleV2 } from '../../v2/proxy.v2.module';

@Module({
    imports: [
        CommonAppModule,
        MXCommunicationModule,
        PairModule,
        WrappingModule,
        TokenModule,
        ProxyModuleV2,
    ],
    providers: [ProxyPairAbiService, ProxyPairTransactionsService],
    exports: [ProxyPairAbiService, ProxyPairTransactionsService],
})
export class ProxyPairModule {}
