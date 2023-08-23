import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { TokenModule } from '../tokens/token.module';
import { EnergyModule } from '../energy/energy.module';
import { GovernanceEnergyAbiService, GovernanceTokenSnapshotAbiService } from './services/governance.abi.service';
import { GovernanceService } from './services/governance.service';
import { GovernanceQuorumService } from './services/governance.quorum.service';
import { GovernanceTokenSnapshotMerkleService } from './services/governance.token.snapshot.merkle.service';
import { GovernanceComputeService } from './services/governance.compute.service';
import { GovernanceTransactionService } from './resolvers/governance.transaction.resolver';
import { GovernanceDescriptionService } from './services/governance.description.service';
import {
    GovernanceEnergyContractResolver,
    GovernanceTokenSnapshotContractResolver,
} from './resolvers/governance.contract.resolver';
import { GovernanceSetterService } from './services/governance.setter.service';
import { GovernanceQueryResolver } from './resolvers/governance.query.resolver';
import { GovernanceMexV2ProposalResolver, GovernanceProposalResolver } from './resolvers/governance.proposal.resolver';
import { ElasticService } from 'src/helpers/elastic.service';

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
        GovernanceSetterService,
        GovernanceComputeService,
        GovernanceTransactionService,
        GovernanceDescriptionService,

        GovernanceQueryResolver,
        GovernanceEnergyContractResolver,
        GovernanceTokenSnapshotContractResolver,
        GovernanceProposalResolver,
        GovernanceMexV2ProposalResolver,
        ElasticService,
    ],
    exports: [
        GovernanceTokenSnapshotAbiService,
        GovernanceEnergyAbiService,
        GovernanceSetterService,
        GovernanceComputeService,
        GovernanceService,
    ],
})
export class GovernanceModule {}
