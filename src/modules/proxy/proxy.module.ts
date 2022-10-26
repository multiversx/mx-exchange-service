import { forwardRef, Module } from '@nestjs/common';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { AbiProxyService } from './services/proxy-abi.service';
import { ProxyFarmModule } from './services/proxy-farm/proxy-farm.module';
import { ProxyPairModule } from './services/proxy-pair/proxy-pair.module';
import { ProxyResolver } from './proxy.resolver';
import { ProxyService } from './services/proxy.service';
import { CachingModule } from '../../services/caching/cache.module';
import { ProxyGetterService } from './services/proxy.getter.service';
import { LockedAssetModule } from '../locked-asset-factory/locked-asset.module';
import { WrappedLpTokenResolver } from './wrappedLpToken.resolver';
import { WrappedFarmTokenResolver } from './wrappedFarmToken.resolver';
import { TokenModule } from '../tokens/token.module';
import { FarmModule } from '../farm/farm.module';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        ContextModule,
        LockedAssetModule,
        TokenModule,
        forwardRef(() => ProxyPairModule),
        forwardRef(() => ProxyFarmModule),
        FarmModule,
    ],
    providers: [
        AbiProxyService,
        ProxyService,
        ProxyGetterService,
        ProxyResolver,
        WrappedLpTokenResolver,
        WrappedFarmTokenResolver,
    ],
    exports: [ProxyService, AbiProxyService, ProxyGetterService, ProxyResolver],
})
export class ProxyModule {}
