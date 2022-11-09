import { forwardRef, Module } from '@nestjs/common';
import { TokenModule } from 'src/modules/tokens/token.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { ProxyModule } from '../proxy.module';
import { ProxyAbiServiceV2 } from './services/proxy.v2.abi.service';
import { ProxyGetterServiceV2 } from './services/proxy.v2.getter.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        TokenModule,
        forwardRef(() => ProxyModule),
    ],
    providers: [ProxyAbiServiceV2, ProxyGetterServiceV2],
    exports: [ProxyGetterServiceV2],
})
export class ProxyModuleV2 {}
