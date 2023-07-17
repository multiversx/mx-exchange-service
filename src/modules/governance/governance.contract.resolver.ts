import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GovernanceAbiService } from './services/governance.abi.service';
import { GovernanceContract } from './models/governance.contract.model';
import { GovernanceProposal } from './models/governance.proposal.model';

@Resolver(() => GovernanceContract)
export class GovernanceContractResolver {
    constructor(
        private readonly governanceAbi: GovernanceAbiService,
    ) {
    }

    @ResolveField()
    async minEnergyForPropose(@Parent() governanceContract: GovernanceContract): Promise<string> {
        return this.governanceAbi.minEnergyForPropose(governanceContract.address);
    }

    @ResolveField()
    async minFeeForPropose(@Parent() governanceContract: GovernanceContract): Promise<string> {
        return this.governanceAbi.minFeeForPropose(governanceContract.address);
    }

    @ResolveField()
    async quorum(@Parent() governanceContract: GovernanceContract): Promise<string> {
        return this.governanceAbi.quorum(governanceContract.address);
    }

    @ResolveField()
    async votingDelayInBlocks(@Parent() governanceContract: GovernanceContract): Promise<number> {
        return this.governanceAbi.votingDelayInBlocks(governanceContract.address);
    }

    @ResolveField()
    async votingPeriodInBlocks(@Parent() governanceContract: GovernanceContract): Promise<number> {
        return this.governanceAbi.votingPeriodInBlocks(governanceContract.address);
    }

    @ResolveField()
    async feeTokenId(@Parent() governanceContract: GovernanceContract): Promise<string> {
        return this.governanceAbi.feeTokenId(governanceContract.address);
    }

    @ResolveField()
    async withdrawPercentageDefeated(@Parent() governanceContract: GovernanceContract): Promise<number> {
        return this.governanceAbi.withdrawPercentageDefeated(governanceContract.address);
    }

    @ResolveField(() => [GovernanceProposal])
    async proposals(@Parent() governanceContract: GovernanceContract): Promise<GovernanceProposal[]> {
        return this.governanceAbi.proposals(governanceContract.address);
    }

    @ResolveField()
    async feesCollectorAddress(@Parent() governanceContract: GovernanceContract): Promise<string> {
        return this.governanceAbi.feesCollectorAddress(governanceContract.address);
    }

    @ResolveField()
    async energyFactoryAddress(@Parent() governanceContract: GovernanceContract): Promise<string> {
        return this.governanceAbi.energyFactoryAddress(governanceContract.address);
    }
}
