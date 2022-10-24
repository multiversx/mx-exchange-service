import { Module } from '@nestjs/common';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { PairModule } from '../pair/pair.module';
import { ProxyFarmModule } from '../proxy/services/proxy-farm/proxy-farm.module';
import { ProxyPairModule } from '../proxy/services/proxy-pair/proxy-pair.module';
import { ProxyModule } from '../proxy/proxy.module';
import { UserResolver } from './user.resolver';
import { UserService } from './services/user.metaEsdt.service';
import { LockedAssetModule } from '../locked-asset-factory/locked-asset.module';
import { WrappingModule } from '../wrapping/wrap.module';
import { UserComputeService } from './services/metaEsdt.compute.service';
import { CachingModule } from 'src/services/caching/cache.module';
import { StakingModule } from '../staking/staking.module';
import { StakingProxyModule } from '../staking-proxy/staking.proxy.module';
import { PriceDiscoveryModule } from '../price-discovery/price.discovery.module';
import { SimpleLockModule } from '../simple-lock/simple.lock.module';
import { UserTokenResolver } from './user.token.resolver';
import { TokenModule } from '../tokens/token.module';
import { RemoteConfigModule } from '../remote-config/remote-config.module';
import { RouterModule } from '../router/router.module';
import { UserEsdtService } from './services/user.esdt.service';
import { UserEsdtComputeService } from './services/esdt.compute.service';
import { FarmBaseModule } from '../farm/base-module/farm.base.module';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        ContextModule,
        RouterModule,
        PairModule,
        ProxyModule,
        ProxyPairModule,
        ProxyFarmModule,
        FarmBaseModule,
        LockedAssetModule,
        WrappingModule,
        StakingModule,
        StakingProxyModule,
        PriceDiscoveryModule,
        SimpleLockModule,
        TokenModule,
        RemoteConfigModule,
    ],
    providers: [
        UserEsdtService,
        UserService,
        UserEsdtComputeService,
        UserComputeService,
        UserResolver,
        UserTokenResolver,
    ],
    exports: [UserService],
})
export class UserModule {}
