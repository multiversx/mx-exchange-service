import { Module } from '@nestjs/common';
import { ContextModule } from '../../services/context/context.module';
import { AbiDistributionService } from './services/abi-distribution.service';
import { DistributionResolver } from './distribution.resolver';
import { DistributionService } from './services/distribution.service';
import { TransactionsDistributionService } from './services/transaction-distribution.service';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { CachingModule } from '../../services/caching/cache.module';
import { DistributionGetterService } from './services/distribution.getter.service';

@Module({
    imports: [ContextModule, ElrondCommunicationModule, CachingModule],
    providers: [
        DistributionService,
        DistributionGetterService,
        AbiDistributionService,
        TransactionsDistributionService,
        DistributionResolver,
    ],
    exports: [DistributionService],
})
export class DistributionModule {}
