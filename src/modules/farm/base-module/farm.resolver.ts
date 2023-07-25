import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { BaseFarmModel } from '../models/farm.model';
import { PairModel } from '../../pair/models/pair.model';
import { EsdtToken } from '../../tokens/models/esdtToken.model';
import { NftCollection } from '../../tokens/models/nftCollection.model';
import { Address } from '@multiversx/sdk-core';
import { FarmAbiService } from './services/farm.abi.service';
import { FarmServiceBase } from './services/farm.base.service';
import { FarmComputeService } from './services/farm.compute.service';

@Resolver(() => BaseFarmModel)
export class FarmResolver {
    constructor(
        protected readonly farmAbi: FarmAbiService,
        protected readonly farmService: FarmServiceBase,
        protected readonly farmCompute: FarmComputeService,
    ) {}

    @ResolveField()
    async farmedToken(@Parent() parent: BaseFarmModel): Promise<EsdtToken> {
        return this.farmService.getFarmedToken(parent.address);
    }

    @ResolveField()
    async farmToken(@Parent() parent: BaseFarmModel): Promise<NftCollection> {
        return this.farmService.getFarmToken(parent.address);
    }

    @ResolveField()
    async farmingToken(@Parent() parent: BaseFarmModel): Promise<EsdtToken> {
        return this.farmService.getFarmingToken(parent.address);
    }

    @ResolveField()
    async produceRewardsEnabled(
        @Parent() parent: BaseFarmModel,
    ): Promise<boolean> {
        return this.farmAbi.produceRewardsEnabled(parent.address);
    }

    @ResolveField()
    async perBlockRewards(@Parent() parent: BaseFarmModel): Promise<string> {
        return this.farmAbi.rewardsPerBlock(parent.address);
    }

    @ResolveField()
    async farmTokenSupply(@Parent() parent: BaseFarmModel): Promise<string> {
        return this.farmAbi.farmTokenSupply(parent.address);
    }

    @ResolveField()
    async farmedTokenPriceUSD(
        @Parent() parent: BaseFarmModel,
    ): Promise<string> {
        return this.farmCompute.farmedTokenPriceUSD(parent.address);
    }

    @ResolveField()
    async farmTokenPriceUSD(@Parent() parent: BaseFarmModel): Promise<string> {
        return this.farmCompute.farmTokenPriceUSD(parent.address);
    }

    @ResolveField()
    async farmingTokenPriceUSD(
        @Parent() parent: BaseFarmModel,
    ): Promise<string> {
        return this.farmCompute.farmingTokenPriceUSD(parent.address);
    }

    @ResolveField()
    async penaltyPercent(@Parent() parent: BaseFarmModel): Promise<number> {
        return this.farmAbi.penaltyPercent(parent.address);
    }

    @ResolveField()
    async minimumFarmingEpochs(
        @Parent() parent: BaseFarmModel,
    ): Promise<number> {
        return this.farmAbi.minimumFarmingEpochs(parent.address);
    }

    @ResolveField()
    async rewardPerShare(@Parent() parent: BaseFarmModel): Promise<string> {
        return this.farmAbi.rewardPerShare(parent.address);
    }

    @ResolveField()
    async rewardReserve(@Parent() parent: BaseFarmModel): Promise<string> {
        return this.farmAbi.rewardReserve(parent.address);
    }

    @ResolveField()
    async lastRewardBlockNonce(
        @Parent() parent: BaseFarmModel,
    ): Promise<number> {
        return this.farmAbi.lastRewardBlockNonce(parent.address);
    }

    @ResolveField()
    async divisionSafetyConstant(
        @Parent() parent: BaseFarmModel,
    ): Promise<string> {
        return this.farmAbi.divisionSafetyConstant(parent.address);
    }

    @ResolveField()
    async totalValueLockedUSD(parent: BaseFarmModel): Promise<string> {
        return this.farmCompute.farmLockedValueUSD(parent.address);
    }

    @ResolveField()
    async state(@Parent() parent: BaseFarmModel): Promise<string> {
        return this.farmAbi.state(parent.address);
    }

    @ResolveField()
    async burnGasLimit(@Parent() parent: BaseFarmModel): Promise<string> {
        return this.farmAbi.burnGasLimit(parent.address);
    }

    @ResolveField()
    async pair(@Parent() parent: BaseFarmModel): Promise<PairModel> {
        const address = await this.farmAbi.pairContractAddress(parent.address);
        return Address.fromString(address).equals(Address.Zero())
            ? undefined
            : new PairModel({ address });
    }

    @ResolveField()
    async transferExecGasLimit(
        @Parent() parent: BaseFarmModel,
    ): Promise<string> {
        return this.farmAbi.transferExecGasLimit(parent.address);
    }

    @ResolveField()
    async lastErrorMessage(@Parent() parent: BaseFarmModel): Promise<string> {
        return this.farmAbi.lastErrorMessage(parent.address);
    }
}
