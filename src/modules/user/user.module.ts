import { Module } from '@nestjs/common';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { PriceFeedModule } from 'src/services/price-feed/price-feed.module';
import { FarmModule } from '../farm/farm.module';
import { PairModule } from '../pair/pair.module';
import { ProxyFarmModule } from '../proxy/services/proxy-farm/proxy-farm.module';
import { ProxyPairModule } from '../proxy/services/proxy-pair/proxy-pair.module';
import { ProxyModule } from '../proxy/proxy.module';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';
import { LockedAssetModule } from '../locked-asset-factory/locked-asset.module';
import { WrappingModule } from '../wrapping/wrap.module';
import { UserComputeService } from './user.compute.service';
import { CachingModule } from 'src/services/caching/cache.module';
import { StakingModule } from '../staking/staking.module';
import { StakingProxyModule } from '../staking-proxy/staking.proxy.module';
import { PriceDiscoveryModule } from '../price-discovery/price.discovery.module';
import { SimpleLockModule } from '../simple-lock/simple.lock.module';
import { UserTokenResolver } from './user.token.resolver';
import { TokenModule } from '../tokens/token.module';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        ContextModule,
        PairModule,
        PriceFeedModule,
        ProxyModule,
        ProxyPairModule,
        ProxyFarmModule,
        FarmModule,
        LockedAssetModule,
        WrappingModule,
        StakingModule,
        StakingProxyModule,
        PriceDiscoveryModule,
        SimpleLockModule,
        TokenModule,
    ],
    providers: [
        UserService,
        UserComputeService,
        UserResolver,
        UserTokenResolver,
    ],
    exports: [UserService],
})
export class UserModule {}
