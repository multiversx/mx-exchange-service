import { Args, Int, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GovernanceProposalModel } from '../models/governance.proposal.model';
import { EsdtToken } from '../../tokens/models/esdtToken.model';
import { GovernanceEnergyContract, GovernanceTokenSnapshotContract } from '../models/governance.contract.model';
import { GovernanceEnergyAbiService, GovernanceTokenSnapshotAbiService } from '../services/governance.abi.service';
import { GovernanceEnergyService, GovernanceTokenSnapshotService } from '../services/governance.service';

@Resolver(() => GovernanceTokenSnapshotContract)
export class GovernanceTokenSnapshotContractResolver {
    constructor(
        protected readonly governanceAbi: GovernanceTokenSnapshotAbiService,
        protected readonly governanceService: GovernanceTokenSnapshotService,
    ) {
    }

    @ResolveField()
    async shard(@Parent() contract: GovernanceTokenSnapshotContract): Promise<number> {
        return this.governanceAbi.getAddressShardID(contract.address);
    }

    @ResolveField()
    async minFeeForPropose(@Parent() contract: GovernanceTokenSnapshotContract): Promise<string> {
        return this.governanceAbi.minFeeForPropose(contract.address);
    }

    @ResolveField()
    async quorum(@Parent() contract: GovernanceTokenSnapshotContract): Promise<string> {
        return this.governanceAbi.quorum(contract.address);
    }

    @ResolveField()
    async votingDelayInBlocks(@Parent() contract: GovernanceTokenSnapshotContract): Promise<number> {
        return this.governanceAbi.votingDelayInBlocks(contract.address);
    }

    @ResolveField()
    async votingPeriodInBlocks(@Parent() contract: GovernanceTokenSnapshotContract): Promise<number> {
        return this.governanceAbi.votingPeriodInBlocks(contract.address);
    }

    @ResolveField()
    async feeToken(@Parent() contract: GovernanceTokenSnapshotContract): Promise<EsdtToken> {
        return this.governanceService.feeToken(contract.address);
    }

    @ResolveField()
    async withdrawPercentageDefeated(@Parent() contract: GovernanceTokenSnapshotContract): Promise<number> {
        return this.governanceAbi.withdrawPercentageDefeated(contract.address);
    }

    @ResolveField()
    async votingPowerDecimals(@Parent() contract: GovernanceTokenSnapshotContract): Promise<number> {
        return this.governanceService.votingPowerDecimals(contract.address);
    }

    @ResolveField(() => [GovernanceProposalModel])
    async proposals(
        @Parent() contract: GovernanceTokenSnapshotContract,
        @Args('proposalId', {type: ()=> Int, nullable: true}) proposalId?: number
    ): Promise<GovernanceProposalModel[]> {
        const proposals = await this.governanceAbi.proposals(contract.address);

        if(proposalId) {
            return proposals.filter(proposal => proposal.proposalId === proposalId);
        } else {
            return proposals;
        }
    }
}

@Resolver(() => GovernanceEnergyContract)
export class GovernanceEnergyContractResolver extends GovernanceTokenSnapshotContractResolver {
    constructor(
        protected readonly governanceAbi: GovernanceEnergyAbiService,
        protected readonly governanceService: GovernanceEnergyService,
    ) {
        super(governanceAbi, governanceService);
    }

    @ResolveField()
    async minEnergyForPropose(@Parent() energyContract: GovernanceEnergyContract): Promise<string> {
        return this.governanceAbi.minEnergyForPropose(energyContract.address);
    }

    @ResolveField()
    async feesCollectorAddress(@Parent() energyContract: GovernanceEnergyContract): Promise<string> {
        return this.governanceAbi.feesCollectorAddress(energyContract.address);
    }

    @ResolveField()
    async energyFactoryAddress(@Parent() energyContract: GovernanceEnergyContract): Promise<string> {
        return this.governanceAbi.energyFactoryAddress(energyContract.address);
    }
}
