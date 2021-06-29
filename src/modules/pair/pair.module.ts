import { Module } from '@nestjs/common';
import { PairService } from './pair.service';
import { PairResolver } from './pair.resolver';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { AbiPairService } from './abi-pair.service';
import { TransactionPairService } from './transactions-pair.service';
import { PriceFeedModule } from '../../services/price-feed/price-feed.module';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';

@Module({
    imports: [
        ElrondCommunicationModule,
        CacheManagerModule,
        ContextModule,
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
