import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { TokenModule } from '../tokens/token.module';
import { EnergyModule } from '../energy/energy.module';
import { GovernanceAbiService } from './services/governance.abi.service';
import { GovernanceQueryResolver } from './governance.query.resolver';
import { EnergyContractResolver } from './governance.contract.resolver';
import { GovernanceProposalResolver } from './governance.propose.resolver';
import { GovernanceService } from './services/governance.service';
import { GovernanceTransactionResolver } from './governance.transaction.resolver';


@Module({
    imports: [
        CommonAppModule,
        CachingModule,
        MXCommunicationModule,
        ContextModule,
        TokenModule,
        EnergyModule
    ],
    providers: [
        GovernanceService,
        GovernanceAbiService,
        // GovernanceSetterService,
        // GovernanceComputeService,
        GovernanceTransactionResolver,
        GovernanceQueryResolver,
        EnergyContractResolver,
        GovernanceProposalResolver,
    ],
    exports: [
        GovernanceAbiService,
        // GovernanceSetterService,
        // GovernanceComputeService,
        GovernanceService,
    ],
})
export class GovernanceModule {}
