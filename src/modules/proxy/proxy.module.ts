import { forwardRef, Module } from '@nestjs/common';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { FarmModule } from '../farm/farm.module';
import { AbiProxyService } from './services/proxy-abi.service';
import { ProxyFarmModule } from './services/proxy-farm/proxy-farm.module';
import { ProxyPairModule } from './services/proxy-pair/proxy-pair.module';
import { ProxyResolver } from './proxy.resolver';
import { ProxyService } from './services/proxy.service';
import { CachingModule } from '../../services/caching/cache.module';
import { ProxyGetterService } from './services/proxy.getter.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        ContextModule,
        forwardRef(() => ProxyPairModule),
        forwardRef(() => ProxyFarmModule),
        forwardRef(() => FarmModule),
    ],
    providers: [
        AbiProxyService,
        ProxyService,
        ProxyGetterService,
        ProxyResolver,
    ],
    exports: [ProxyService, AbiProxyService, ProxyGetterService, ProxyResolver],
})
export class ProxyModule {}
