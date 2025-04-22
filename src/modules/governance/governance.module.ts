import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { ContextModule } from 'src/services/context/context.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { TokenModule } from '../tokens/token.module';
import { EnergyModule } from '../energy/energy.module';
import {
    GovernanceEnergyAbiService,
    GovernanceTokenSnapshotAbiService,
} from './services/governance.abi.service';
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
import { GovernanceProposalResolver } from './resolvers/governance.proposal.resolver';
import {
    GovernanceEnergyService,
    GovernanceTokenSnapshotService,
} from './services/governance.service';
import { GovernanceAbiFactory } from './services/governance.abi.factory';
import { GovernanceServiceFactory } from './services/governance.factory';
import { GovernanceOldEnergyAbiService } from './services/governance.old.energy.abi.service';
import { LockedAssetModule } from '../locked-asset-factory/locked-asset.module';
import { ElasticSearchModule } from 'src/services/elastic-search/elastic.search.module';

@Module({
    imports: [
        CommonAppModule,
        MXCommunicationModule,
        ContextModule,
        TokenModule,
        EnergyModule,
        LockedAssetModule,
        ElasticSearchModule,
    ],
    providers: [
        GovernanceTokenSnapshotService,
        GovernanceEnergyService,
        GovernanceAbiFactory,
        GovernanceServiceFactory,
        GovernanceTokenSnapshotAbiService,
        GovernanceEnergyAbiService,
        GovernanceOldEnergyAbiService,
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
    ],
    exports: [
        GovernanceTokenSnapshotAbiService,
        GovernanceEnergyAbiService,
        GovernanceSetterService,
        GovernanceComputeService,
        GovernanceTokenSnapshotService,
        GovernanceEnergyService,
        GovernanceAbiFactory,
    ],
})
export class GovernanceModule {}
