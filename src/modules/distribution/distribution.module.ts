import { Module } from '@nestjs/common';
import { ContextModule } from '../../services/context/context.module';
import { DistributionAbiService } from './services/distribution.abi.service';
import { DistributionResolver } from './distribution.resolver';
import { DistributionTransactionsService } from './services/distribution.transactions.service';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';

@Module({
    imports: [ContextModule, MXCommunicationModule],
    providers: [
        DistributionAbiService,
        DistributionTransactionsService,
        DistributionResolver,
    ],
})
export class DistributionModule {}
