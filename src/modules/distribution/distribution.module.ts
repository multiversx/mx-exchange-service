import { Module } from '@nestjs/common';
import { ContextModule } from '../../services/context/context.module';
import { DistributionAbiService } from './services/distribution.abi.service';
import { DistributionResolver } from './distribution.resolver';
import { DistributionService } from './services/distribution.service';
import { DistributionTransactionsService } from './services/distribution.transactions.service';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { CachingModule } from '../../services/caching/cache.module';
import { DistributionGetterService } from './services/distribution.getter.service';

@Module({
    imports: [ContextModule, MXCommunicationModule, CachingModule],
    providers: [
        DistributionService,
        DistributionGetterService,
        DistributionAbiService,
        DistributionTransactionsService,
        DistributionResolver,
    ],
    exports: [DistributionService],
})
export class DistributionModule {}
