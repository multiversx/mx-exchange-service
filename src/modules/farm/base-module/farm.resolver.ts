import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { BaseFarmModel } from '../models/farm.model';
import { PairModel } from '../../pair/models/pair.model';
import { EsdtToken } from '../../tokens/models/esdtToken.model';
import { NftCollection } from '../../tokens/models/nftCollection.model';
import { Address } from '@multiversx/sdk-core';
import { FarmAbiService } from './services/farm.abi.service';
import { FarmServiceBase } from './services/farm.base.service';
import { FarmComputeService } from './services/farm.compute.service';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FarmAbiLoader } from './services/farm.abi.loader';
import { FarmComputeLoader } from './services/farm.compute.loader';

@Resolver(() => BaseFarmModel)
export class FarmResolver {
    constructor(
        protected readonly farmAbi: FarmAbiService,
        protected readonly farmService: FarmServiceBase,
        protected readonly farmCompute: FarmComputeService,
        protected readonly farmAbiLoader: FarmAbiLoader,
        protected readonly farmComputeLoader: FarmComputeLoader,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {}

    @ResolveField()
    async farmedToken(@Parent() parent: BaseFarmModel): Promise<EsdtToken> {
        return this.farmAbiLoader.farmedTokenLoader.load(parent.address);
    }

    @ResolveField()
    async farmToken(@Parent() parent: BaseFarmModel): Promise<NftCollection> {
        return this.farmAbiLoader.farmTokenLoader.load(parent.address);
    }

    @ResolveField()
    async farmingToken(@Parent() parent: BaseFarmModel): Promise<EsdtToken> {
        return this.farmAbiLoader.farmingTokenLoader.load(parent.address);
    }

    @ResolveField()
    async produceRewardsEnabled(
        @Parent() parent: BaseFarmModel,
    ): Promise<boolean> {
        return this.farmAbiLoader.produceRewardsEnabledLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async perBlockRewards(@Parent() parent: BaseFarmModel): Promise<string> {
        return this.farmAbiLoader.perBlockRewardsLoader.load(parent.address);
    }

    @ResolveField()
    async farmTokenSupply(@Parent() parent: BaseFarmModel): Promise<string> {
        return this.farmAbiLoader.farmTokenSupplyLoader.load(parent.address);
    }

    @ResolveField()
    async farmedTokenPriceUSD(
        @Parent() parent: BaseFarmModel,
    ): Promise<string> {
        return this.farmComputeLoader.farmedTokenPriceUSDLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async farmTokenPriceUSD(@Parent() parent: BaseFarmModel): Promise<string> {
        return this.farmComputeLoader.farmTokenPriceUSDLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async farmingTokenPriceUSD(
        @Parent() parent: BaseFarmModel,
    ): Promise<string> {
        return this.farmComputeLoader.farmingTokenPriceUSDLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async penaltyPercent(@Parent() parent: BaseFarmModel): Promise<number> {
        return this.farmAbiLoader.penaltyPercentLoader.load(parent.address);
    }

    @ResolveField()
    async minimumFarmingEpochs(
        @Parent() parent: BaseFarmModel,
    ): Promise<number> {
        return this.farmAbiLoader.minimumFarmingEpochsLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async rewardPerShare(@Parent() parent: BaseFarmModel): Promise<string> {
        return this.farmAbiLoader.rewardPerShareLoader.load(parent.address);
    }

    @ResolveField()
    async rewardReserve(@Parent() parent: BaseFarmModel): Promise<string> {
        return this.farmAbiLoader.rewardReserveLoader.load(parent.address);
    }

    @ResolveField()
    async lastRewardBlockNonce(
        @Parent() parent: BaseFarmModel,
    ): Promise<number> {
        return this.farmAbiLoader.lastRewardBlockNonceLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async divisionSafetyConstant(
        @Parent() parent: BaseFarmModel,
    ): Promise<string> {
        return this.farmAbiLoader.divisionSafetyConstantLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async totalValueLockedUSD(parent: BaseFarmModel): Promise<string> {
        return this.farmComputeLoader.farmLockedValueUSDLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async state(@Parent() parent: BaseFarmModel): Promise<string> {
        return this.farmAbiLoader.stateLoader.load(parent.address);
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
