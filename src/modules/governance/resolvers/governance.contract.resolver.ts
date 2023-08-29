import { Args, Int, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GovernanceProposalModel } from '../models/governance.proposal.model';
import { EsdtToken } from '../../tokens/models/esdtToken.model';
import { GovernanceEnergyContract, GovernanceTokenSnapshotContract } from '../models/governance.contract.model';
import { GovernanceAbiFactory } from '../services/governance.abi.factory';
import { GovernanceServiceFactory } from '../services/governance.factory';
import { GovernanceEnergyAbiService } from '../services/governance.abi.service';

@Resolver(() => GovernanceTokenSnapshotContract)
export class GovernanceTokenSnapshotContractResolver {
    constructor(
        protected readonly governanceAbiFactory: GovernanceAbiFactory,
        protected readonly governanceServiceFactory: GovernanceServiceFactory,
    ) {
    }

    @ResolveField()
    async shard(@Parent() contract: GovernanceTokenSnapshotContract): Promise<number> {
        return this.governanceAbiFactory.useAbi(contract.address).getAddressShardID(contract.address);
    }

    @ResolveField()
    async minFeeForPropose(@Parent() contract: GovernanceTokenSnapshotContract): Promise<string> {
        return this.governanceAbiFactory.useAbi(contract.address).minFeeForPropose(contract.address);
    }

    @ResolveField()
    async quorum(@Parent() contract: GovernanceTokenSnapshotContract): Promise<string> {
        return this.governanceAbiFactory.useAbi(contract.address).quorum(contract.address);
    }

    @ResolveField()
    async votingDelayInBlocks(@Parent() contract: GovernanceTokenSnapshotContract): Promise<number> {
        return this.governanceAbiFactory.useAbi(contract.address).votingDelayInBlocks(contract.address);
    }

    @ResolveField()
    async votingPeriodInBlocks(@Parent() contract: GovernanceTokenSnapshotContract): Promise<number> {
        return this.governanceAbiFactory.useAbi(contract.address).votingPeriodInBlocks(contract.address);
    }

    @ResolveField()
    async feeToken(@Parent() contract: GovernanceTokenSnapshotContract): Promise<EsdtToken> {
        return this.governanceServiceFactory.userService(contract.address).feeToken(contract.address);
    }

    @ResolveField()
    async withdrawPercentageDefeated(@Parent() contract: GovernanceTokenSnapshotContract): Promise<number> {
        return this.governanceAbiFactory.useAbi(contract.address).withdrawPercentageDefeated(contract.address);
    }

    @ResolveField()
    async votingPowerDecimals(@Parent() contract: GovernanceTokenSnapshotContract): Promise<number> {
        return this.governanceServiceFactory.userService(contract.address).votingPowerDecimals(contract.address);
    }

    @ResolveField(() => [GovernanceProposalModel])
    async proposals(
        @Parent() contract: GovernanceTokenSnapshotContract,
        @Args('proposalId', {type: ()=> Int, nullable: true}) proposalId?: number
    ): Promise<GovernanceProposalModel[]> {
        const proposals = await this.governanceAbiFactory.useAbi(contract.address).proposals(contract.address);

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
        protected readonly governanceAbiFactory: GovernanceAbiFactory,
        protected readonly governanceServiceFactory: GovernanceServiceFactory,
    ) {
        super(governanceAbiFactory, governanceServiceFactory);
    }

    @ResolveField()
    async minEnergyForPropose(@Parent() contract: GovernanceEnergyContract): Promise<string> {
        const abi = this.governanceAbiFactory.useAbi(contract.address) as GovernanceEnergyAbiService;
        return abi.minEnergyForPropose(contract.address);
    }

    @ResolveField()
    async feesCollectorAddress(@Parent() contract: GovernanceEnergyContract): Promise<string> {
        const abi = this.governanceAbiFactory.useAbi(contract.address) as GovernanceEnergyAbiService;
        return abi.feesCollectorAddress(contract.address);
    }

    @ResolveField()
    async energyFactoryAddress(@Parent() contract: GovernanceEnergyContract): Promise<string> {
        const abi = this.governanceAbiFactory.useAbi(contract.address) as GovernanceEnergyAbiService;
        return abi.energyFactoryAddress(contract.address);
    }
}
