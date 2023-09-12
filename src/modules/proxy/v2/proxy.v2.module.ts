import { forwardRef, Module } from '@nestjs/common';
import { TokenModule } from 'src/modules/tokens/token.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { ProxyModule } from '../proxy.module';
import { ProxyAbiServiceV2 } from './services/proxy.v2.abi.service';

@Module({
    imports: [
        MXCommunicationModule,
        TokenModule,
        forwardRef(() => ProxyModule),
    ],
    providers: [ProxyAbiServiceV2],
    exports: [ProxyAbiServiceV2],
})
export class ProxyModuleV2 {}
