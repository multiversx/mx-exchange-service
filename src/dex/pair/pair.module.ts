import { Module } from '@nestjs/common';
import { PairService } from './pair.service';
import { PairResolver } from './pair.resolver';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { ContextModule } from '../utils/context.module';
import { ServicesModule } from 'src/services';
import { AbiPairService } from './abi-pair.service';
import { TransactionPairService } from './transactions-pair.service';
import { PriceFeedModule } from 'src/services/price-feed/price-feed.module';

@Module({
    imports: [
        CacheManagerModule,
        ContextModule,
        ServicesModule,
        PriceFeedModule,
    ],
    providers: [
        PairService,
        AbiPairService,
        TransactionPairService,
        PairResolver,
    ],
    exports: [PairService],
})
export class PairModule {}
