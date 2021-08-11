import { Module } from '@nestjs/common';
import { ContextModule } from '../../services/context/context.module';
import { AbiDistributionService } from './abi-distribution.service';
import { DistributionResolver } from './distribution.resolver';
import { DistributionService } from './distribution.service';
import { TransactionsDistributionService } from './transaction-distribution.service';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { CachingModule } from '../../services/caching/cache.module';

@Module({
    imports: [ContextModule, ElrondCommunicationModule, CachingModule],
    providers: [
        DistributionService,
        AbiDistributionService,
        TransactionsDistributionService,
        DistributionResolver,
    ],
    exports: [DistributionService],
})
export class DistributionModule {}
