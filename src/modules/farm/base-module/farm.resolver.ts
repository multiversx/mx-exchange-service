import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { BaseFarmModel } from '../models/farm.model';
import { ApolloError } from 'apollo-server-express';
import { FarmGetterService } from './services/farm.getter.service';
import { PairModel } from '../../pair/models/pair.model';
import { LockedAssetModel } from '../../locked-asset-factory/models/locked-asset.model';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { EsdtToken } from '../../tokens/models/esdtToken.model';
import { NftCollection } from '../../tokens/models/nftCollection.model';
import { Address } from '@multiversx/sdk-core';

@Resolver(() => BaseFarmModel)
export class FarmResolver extends GenericResolver {
    constructor(protected readonly farmGetter: FarmGetterService) {
        super();
    }

    @ResolveField()
    async farmedToken(@Parent() parent: BaseFarmModel): Promise<EsdtToken> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getFarmedToken(parent.address),
        );
    }

    @ResolveField()
    async farmToken(@Parent() parent: BaseFarmModel): Promise<NftCollection> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getFarmToken(parent.address),
        );
    }

    @ResolveField()
    async farmingToken(@Parent() parent: BaseFarmModel): Promise<EsdtToken> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getFarmingToken(parent.address),
        );
    }

    @ResolveField()
    async produceRewardsEnabled(
        @Parent() parent: BaseFarmModel,
    ): Promise<boolean> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getProduceRewardsEnabled(parent.address),
        );
    }

    @ResolveField()
    async perBlockRewards(@Parent() parent: BaseFarmModel): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getRewardsPerBlock(parent.address),
        );
    }

    @ResolveField()
    async farmTokenSupply(@Parent() parent: BaseFarmModel): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getFarmTokenSupply(parent.address),
        );
    }

    @ResolveField()
    async farmedTokenPriceUSD(
        @Parent() parent: BaseFarmModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getFarmedTokenPriceUSD(parent.address),
        );
    }

    @ResolveField()
    async farmTokenPriceUSD(@Parent() parent: BaseFarmModel): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getFarmTokenPriceUSD(parent.address),
        );
    }

    @ResolveField()
    async farmingTokenPriceUSD(
        @Parent() parent: BaseFarmModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getFarmingTokenPriceUSD(parent.address),
        );
    }

    @ResolveField()
    async penaltyPercent(@Parent() parent: BaseFarmModel): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getPenaltyPercent(parent.address),
        );
    }

    @ResolveField()
    async minimumFarmingEpochs(
        @Parent() parent: BaseFarmModel,
    ): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getMinimumFarmingEpochs(parent.address),
        );
    }

    @ResolveField()
    async rewardPerShare(@Parent() parent: BaseFarmModel): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getRewardPerShare(parent.address),
        );
    }

    @ResolveField()
    async rewardReserve(@Parent() parent: BaseFarmModel): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getRewardReserve(parent.address),
        );
    }

    @ResolveField()
    async lastRewardBlockNonce(
        @Parent() parent: BaseFarmModel,
    ): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getLastRewardBlockNonce(parent.address),
        );
    }

    @ResolveField()
    async divisionSafetyConstant(
        @Parent() parent: BaseFarmModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getDivisionSafetyConstant(parent.address),
        );
    }

    @ResolveField()
    async totalValueLockedUSD(parent: BaseFarmModel): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getTotalValueLockedUSD(parent.address),
        );
    }

    @ResolveField()
    async state(@Parent() parent: BaseFarmModel): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getState(parent.address),
        );
    }

    @ResolveField()
    async burnGasLimit(@Parent() parent: BaseFarmModel): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getBurnGasLimit(parent.address),
        );
    }

    @ResolveField()
    async pair(@Parent() parent: BaseFarmModel): Promise<PairModel> {
        try {
            const address = await this.farmGetter.getPairContractManagedAddress(
                parent.address,
            );
            return Address.fromString(address).equals(Address.Zero())
                ? undefined
                : new PairModel({ address });
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lockedAssetFactory(
        @Parent() parent: BaseFarmModel,
    ): Promise<LockedAssetModel> {
        try {
            const address =
                await this.farmGetter.getLockedAssetFactoryManagedAddress(
                    parent.address,
                );
            return new LockedAssetModel({ address });
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async transferExecGasLimit(
        @Parent() parent: BaseFarmModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getTransferExecGasLimit(parent.address),
        );
    }

    @ResolveField()
    async lastErrorMessage(@Parent() parent: BaseFarmModel): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getLastErrorMessage(parent.address),
        );
    }
}
