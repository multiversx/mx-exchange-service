import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GovernanceAbiService } from './services/governance.abi.service';
import { GovernanceEnergyContract } from './models/energy.contract.model';
import { GovernanceProposal } from './models/governance.proposal.model';

@Resolver(() => GovernanceEnergyContract)
export class GovernanceEnergyContractResolver {
    constructor(
        private readonly governanceAbi: GovernanceAbiService,
    ) {
    }

    @ResolveField()
    async minEnergyForPropose(@Parent() energyContract: GovernanceEnergyContract): Promise<string> {
        return this.governanceAbi.minEnergyForPropose(energyContract.address);
    }

    @ResolveField()
    async minFeeForPropose(@Parent() energyContract: GovernanceEnergyContract): Promise<string> {
        return this.governanceAbi.minFeeForPropose(energyContract.address);
    }

    @ResolveField()
    async quorum(@Parent() energyContract: GovernanceEnergyContract): Promise<string> {
        return this.governanceAbi.quorum(energyContract.address);
    }

    @ResolveField()
    async votingDelayInBlocks(@Parent() energyContract: GovernanceEnergyContract): Promise<number> {
        return this.governanceAbi.votingDelayInBlocks(energyContract.address);
    }

    @ResolveField()
    async votingPeriodInBlocks(@Parent() energyContract: GovernanceEnergyContract): Promise<number> {
        return this.governanceAbi.votingPeriodInBlocks(energyContract.address);
    }

    @ResolveField()
    async feeTokenId(@Parent() energyContract: GovernanceEnergyContract): Promise<string> {
        return this.governanceAbi.feeTokenId(energyContract.address);
    }

    @ResolveField()
    async withdrawPercentageDefeated(@Parent() energyContract: GovernanceEnergyContract): Promise<number> {
        return this.governanceAbi.withdrawPercentageDefeated(energyContract.address);
    }

    @ResolveField(() => [GovernanceProposal])
    async proposals(@Parent() energyContract: GovernanceEnergyContract): Promise<GovernanceProposal[]> {
        return this.governanceAbi.proposals(energyContract.address);
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
