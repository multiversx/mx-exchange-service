import { Module } from '@nestjs/common';
import { ContextModule } from '../../services/context/context.module';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { AbiDistributionService } from './abi-distribution.service';
import { DistributionResolver } from './distribution.resolver';
import { DistributionService } from './distribution.service';
import { TransactionsDistributionService } from './transaction-distribution.service';

@Module({
    imports: [CacheManagerModule, ContextModule],
    providers: [
        DistributionService,
        AbiDistributionService,
        TransactionsDistributionService,
        DistributionResolver,
    ],
    exports: [DistributionService],
})
export class DistributionModule {}
