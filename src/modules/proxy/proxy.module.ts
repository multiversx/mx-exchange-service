import { forwardRef, Module } from '@nestjs/common';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { FarmModule } from '../farm/farm.module';
import { AbiProxyService } from './proxy-abi.service';
import { ProxyFarmModule } from './proxy-farm/proxy-farm.module';
import { ProxyPairModule } from './proxy-pair/proxy-pair.module';
import { ProxyResolver } from './proxy.resolver';
import { ProxyService } from './proxy.service';
import { CachingModule } from '../../services/caching/cache.module';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        ContextModule,
        forwardRef(() => ProxyPairModule),
        forwardRef(() => ProxyFarmModule),
        forwardRef(() => FarmModule),
    ],
    providers: [AbiProxyService, ProxyService, ProxyResolver],
    exports: [ProxyService, AbiProxyService, ProxyResolver],
})
export class ProxyModule {}
