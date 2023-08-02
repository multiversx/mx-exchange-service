import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { TokenModule } from '../tokens/token.module';
import { EnergyModule } from '../energy/energy.module';
import { GovernanceEnergyAbiService, GovernanceTokenSnapshotAbiService } from './services/governance.abi.service';
import { GovernanceQueryResolver } from './resolvers/governance.query.resolver';
import { GovernanceProposalResolver } from './resolvers/governance.proposal.resolver';
import { GovernanceService } from './services/governance.service';
import { GovernanceTransactionService } from './resolvers/governance.transaction.resolver';
import {
    GovernanceEnergyContractResolver,
    GovernanceTokenSnapshotContractResolver,
} from './resolvers/governance.contract.resolver';
import { GovernanceQuorumService } from './services/governance.quorum.service';
import { GovernanceTokenSnapshotMerkleService } from './services/governance.token.snapshot.merkle.service';
import { GovernanceDescriptionService } from './services/governance.description.service';
import { GovernanceComputeService } from './services/governance.compute.service';


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
        GovernanceTokenSnapshotAbiService,
        GovernanceEnergyAbiService,
        GovernanceQuorumService,
        GovernanceTokenSnapshotMerkleService,
        // GovernanceSetterService,
        GovernanceComputeService,
        GovernanceTransactionService,
        GovernanceDescriptionService,

        GovernanceQueryResolver,
        GovernanceEnergyContractResolver,
        GovernanceTokenSnapshotContractResolver,
        GovernanceProposalResolver,
    ],
    exports: [
        GovernanceTokenSnapshotAbiService,
        GovernanceEnergyAbiService,
        // GovernanceSetterService,
        // GovernanceComputeService,
        GovernanceService,
    ],
})
export class GovernanceModule {}
