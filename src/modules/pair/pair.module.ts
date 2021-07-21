import { Module } from '@nestjs/common';
import { PairService } from './pair.service';
import { PairResolver } from './pair.resolver';
import { AbiPairService } from './abi-pair.service';
import { TransactionPairService } from './transactions-pair.service';
import { PriceFeedModule } from '../../services/price-feed/price-feed.module';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { WrappingModule } from '../wrapping/wrap.module';
import { RedisCacheService } from '../../services/redis-cache.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        ContextModule,
        PriceFeedModule,
        WrappingModule,
    ],
    providers: [
        PairService,
        AbiPairService,
        TransactionPairService,
        PairResolver,
        RedisCacheService,
    ],
    exports: [PairService, AbiPairService],
})
export class PairModule {}
