import { Module } from '@nestjs/common';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { PriceFeedModule } from 'src/services/price-feed/price-feed.module';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { FarmModule } from '../farm/farm.module';
import { PairModule } from '../pair/pair.module';
import { ProxyFarmModule } from '../proxy/proxy-farm/proxy-farm.module';
import { ProxyPairModule } from '../proxy/proxy-pair/proxy-pair.module';
import { ProxyModule } from '../proxy/proxy.module';
import { ContextModule } from '../utils/context.module';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        CacheManagerModule,
        ContextModule,
        PairModule,
        PriceFeedModule,
        ProxyModule,
        ProxyPairModule,
        ProxyFarmModule,
        FarmModule,
    ],
    providers: [UserService, UserResolver],
    exports: [UserService],
})
export class UserModule {}
