import { forwardRef, Module } from '@nestjs/common';
import { TokenModule } from 'src/modules/tokens/token.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { ProxyModule } from '../proxy.module';
import { ProxyAbiServiceV1 } from './services/proxy.v1.abi.service';
import { ProxyGetterServiceV1 } from './services/proxy.v1.getter.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        TokenModule,
        forwardRef(() => ProxyModule),
    ],
    providers: [ProxyAbiServiceV1, ProxyGetterServiceV1],
    exports: [ProxyGetterServiceV1],
})
export class ProxyModuleV1 {}
