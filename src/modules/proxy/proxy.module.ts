import { forwardRef, Module } from '@nestjs/common';
import { ContextModule } from '../../services/context/context.module';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { ProxyAbiService } from './services/proxy.abi.service';
import { ProxyFarmModule } from './services/proxy-farm/proxy.farm.module';
import { ProxyPairModule } from './services/proxy-pair/proxy.pair.module';
import { ProxyService } from './services/proxy.service';
import { LockedAssetModule } from '../locked-asset-factory/locked-asset.module';
import { WrappedLpTokenResolver } from './wrappedLpToken.resolver';
import { WrappedFarmTokenResolver } from './wrappedFarmToken.resolver';
import { TokenModule } from '../tokens/token.module';
import { FarmModule } from '../farm/farm.module';
import { ProxyModuleV2 } from './v2/proxy.v2.module';
import { ProxyTransactionResolver } from './proxy.transaction.resolver';
import { ProxyQueryResolver } from './proxy.query.resolver';
import { ProxyResolver } from './proxy.resolver';
import { WrappedLpTokenAttributesResolverV2 } from './wrappedLp.token.v2.resolver';
import { WrappedFarmTokenResolverV2 } from './wrappedFarm.token.v2.resolver';
import { EnergyModule } from '../energy/energy.module';

@Module({
    imports: [
        MXCommunicationModule,
        ContextModule,
        LockedAssetModule,
        TokenModule,
        forwardRef(() => ProxyPairModule),
        forwardRef(() => ProxyFarmModule),
        forwardRef(() => ProxyModuleV2),
        FarmModule,
        EnergyModule,
    ],
    providers: [
        ProxyAbiService,
        ProxyService,
        ProxyResolver,
        ProxyQueryResolver,
        ProxyTransactionResolver,
        WrappedLpTokenResolver,
        WrappedFarmTokenResolver,
        WrappedLpTokenAttributesResolverV2,
        WrappedFarmTokenResolverV2,
    ],
    exports: [ProxyService, ProxyAbiService],
})
export class ProxyModule {}
