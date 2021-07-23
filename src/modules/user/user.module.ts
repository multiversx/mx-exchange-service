import { Module } from '@nestjs/common';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { PriceFeedModule } from 'src/services/price-feed/price-feed.module';
import { FarmModule } from '../farm/farm.module';
import { PairModule } from '../pair/pair.module';
import { ProxyFarmModule } from '../proxy/proxy-farm/proxy-farm.module';
import { ProxyPairModule } from '../proxy/proxy-pair/proxy-pair.module';
import { ProxyModule } from '../proxy/proxy.module';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';
import { LockedAssetModule } from '../locked-asset-factory/locked-asset.module';
import { WrappingModule } from '../wrapping/wrap.module';

@Module({
    imports: [
        ElrondCommunicationModule,
        ContextModule,
        PairModule,
        PriceFeedModule,
        ProxyModule,
        ProxyPairModule,
        ProxyFarmModule,
        FarmModule,
        LockedAssetModule,
        WrappingModule,
    ],
    providers: [UserService, UserResolver],
    exports: [UserService],
})
export class UserModule {}
