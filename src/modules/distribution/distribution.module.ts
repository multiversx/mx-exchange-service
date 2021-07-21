import { Module } from '@nestjs/common';
import { ContextModule } from '../../services/context/context.module';
import { AbiDistributionService } from './abi-distribution.service';
import { DistributionResolver } from './distribution.resolver';
import { DistributionService } from './distribution.service';
import { TransactionsDistributionService } from './transaction-distribution.service';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { RedisCacheService } from 'src/services/redis-cache.service';

@Module({
    imports: [ContextModule, ElrondCommunicationModule],
    providers: [
        DistributionService,
        AbiDistributionService,
        TransactionsDistributionService,
        DistributionResolver,
        RedisCacheService,
    ],
    exports: [DistributionService],
})
export class DistributionModule {}
