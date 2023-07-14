import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { TokenModule } from '../tokens/token.module';
import { EnergyModule } from '../energy/energy.module';
import { GovernanceAbiService } from './services/governance.abi.service';
import { GovernanceQueryResolver } from './governance.query.resolver';
import { GovernanceContractResolver } from './governance.contract.resolver';
import { GovernanceProposalResolver } from './governance.propose.resolver';
import { GovernanceService } from './services/governance.service';


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
        // GovernanceTransactionService,
        GovernanceQueryResolver,
        GovernanceContractResolver,
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
