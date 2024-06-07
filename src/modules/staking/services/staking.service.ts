import {
    StakingFarmTokenAttributes,
    UnbondFarmTokenAttributes,
} from '@multiversx/sdk-exchange';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { CalculateRewardsArgs } from 'src/modules/farm/models/farm.args';
import { DecodeAttributesArgs } from 'src/modules/proxy/models/proxy.args';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { StakingModel, StakingRewardsModel } from '../models/staking.model';
import {
    StakingTokenAttributesModel,
    UnbondTokenAttributesModel,
} from '../models/stakingTokenAttributes.model';
import { StakingAbiService } from './staking.abi.service';
import { StakingComputeService } from './staking.compute.service';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { CollectionType } from 'src/modules/common/collection.type';
import { PaginationArgs } from 'src/modules/dex.model';
import {
    StakingFarmsFilter,
    StakingFarmsSortableFields,
    StakingFarmsSortingArgs,
} from '../models/staking.args';
import { SortingOrder } from 'src/modules/common/page.data';

@Injectable()
export class StakingService {
    constructor(
        private readonly stakingAbi: StakingAbiService,
        @Inject(forwardRef(() => StakingComputeService))
        private readonly stakingCompute: StakingComputeService,
        private readonly contextGetter: ContextGetterService,
        private readonly tokenService: TokenService,
        private readonly apiService: MXApiService,
        private readonly remoteConfigGetter: RemoteConfigGetterService,
    ) {}

    async getFarmsStaking(): Promise<StakingModel[]> {
        const farmsStakingAddresses =
            await this.remoteConfigGetter.getStakingAddresses();

        const farmsStaking: StakingModel[] = [];
        for (const address of farmsStakingAddresses) {
            farmsStaking.push(
                new StakingModel({
                    address,
                }),
            );
        }

        return farmsStaking;
    }

    async getFilteredFarmsStaking(
        pagination: PaginationArgs,
        filters: StakingFarmsFilter,
        sorting: StakingFarmsSortingArgs,
    ): Promise<CollectionType<StakingModel>> {
        let farmsStakingAddresses =
            await this.remoteConfigGetter.getStakingAddresses();

        const farmsStaking = farmsStakingAddresses.map(
            (address) =>
                new StakingModel({
                    address,
                }),
        );

        if (sorting) {
            farmsStakingAddresses = await this.sortFarms(
                farmsStakingAddresses,
                sorting,
            );
        }

        return new CollectionType({
            count: farmsStaking.length,
            items: farmsStaking.slice(
                pagination.offset,
                pagination.offset + pagination.limit,
            ),
        });
    }

    async getFarmToken(stakeAddress: string): Promise<NftCollection> {
        const farmTokenID = await this.stakingAbi.farmTokenID(stakeAddress);
        return await this.tokenService.getNftCollectionMetadata(farmTokenID);
    }

    async getFarmingToken(stakeAddress: string): Promise<EsdtToken> {
        const farmingTokenID = await this.stakingAbi.farmingTokenID(
            stakeAddress,
        );
        return await this.tokenService.getTokenMetadata(farmingTokenID);
    }

    async getRewardToken(stakeAddress: string): Promise<EsdtToken> {
        const rewardTokenID = await this.stakingAbi.rewardTokenID(stakeAddress);
        return await this.tokenService.getTokenMetadata(rewardTokenID);
    }

    decodeStakingTokenAttributes(
        args: DecodeAttributesArgs,
    ): StakingTokenAttributesModel[] {
        return args.batchAttributes.map((arg) => {
            return new StakingTokenAttributesModel({
                ...StakingFarmTokenAttributes.fromAttributes(
                    arg.attributes,
                ).toJSON(),
                attributes: arg.attributes,
                identifier: arg.identifier,
            });
        });
    }

    async decodeUnboundTokenAttributes(
        args: DecodeAttributesArgs,
    ): Promise<UnbondTokenAttributesModel[]> {
        return Promise.all(
            args.batchAttributes.map(async (arg) => {
                const unboundFarmTokenAttributes =
                    UnbondFarmTokenAttributes.fromAttributes(arg.attributes);
                const remainingEpochs = await this.getUnbondigRemaingEpochs(
                    unboundFarmTokenAttributes.unlockEpoch,
                );

                return new UnbondTokenAttributesModel({
                    ...unboundFarmTokenAttributes.toJSON(),
                    remainingEpochs,
                    attributes: arg.attributes,
                    identifier: arg.identifier,
                });
            }),
        );
    }

    async getBatchRewardsForPosition(
        positions: CalculateRewardsArgs[],
    ): Promise<StakingRewardsModel[]> {
        const promises = positions.map(async (position) => {
            return await this.getRewardsForPosition(position);
        });
        return await Promise.all(promises);
    }

    async getRewardsForPosition(
        positon: CalculateRewardsArgs,
    ): Promise<StakingRewardsModel> {
        const stakeTokenAttributes = this.decodeStakingTokenAttributes({
            batchAttributes: [
                {
                    attributes: positon.attributes,
                    identifier: positon.identifier,
                },
            ],
        });
        let rewards: BigNumber;
        if (positon.vmQuery) {
            rewards = await this.stakingAbi.calculateRewardsForGivenPosition(
                positon.farmAddress,
                positon.liquidity,
                positon.attributes,
            );
        } else {
            rewards = await this.stakingCompute.computeStakeRewardsForPosition(
                positon.farmAddress,
                positon.liquidity,
                stakeTokenAttributes[0],
            );
        }

        return new StakingRewardsModel({
            decodedAttributes: stakeTokenAttributes[0],
            rewards: rewards.integerValue().toFixed(),
        });
    }

    private async getUnbondigRemaingEpochs(
        unlockEpoch: number,
    ): Promise<number> {
        const currentEpoch = await this.contextGetter.getCurrentEpoch();

        return unlockEpoch - currentEpoch > 0 ? unlockEpoch - currentEpoch : 0;
    }

    async getStakeFarmAddressByStakeFarmTokenID(
        tokenID: string,
    ): Promise<string> {
        const stakeFarmAddresses: string[] =
            await this.remoteConfigGetter.getStakingAddresses();

        for (const address of stakeFarmAddresses) {
            const stakeFarmTokenID = await this.stakingAbi.farmTokenID(address);
            if (tokenID === stakeFarmTokenID) {
                return address;
            }
        }

        return undefined;
    }

    async isWhitelisted(
        stakeAddress: string,
        address: string,
    ): Promise<boolean> {
        return await this.stakingAbi.isWhitelisted(stakeAddress, address);
    }

    async requireWhitelist(
        stakeAddress: string,
        scAddress: string,
    ): Promise<void> {
        if (!(await this.stakingAbi.isWhitelisted(stakeAddress, scAddress)))
            throw new Error('SC not whitelisted.');
    }

    async requireOwner(stakeAddress: string, sender: string): Promise<void> {
        if (
            (await this.apiService.getAccountStats(stakeAddress))
                .ownerAddress !== sender
        ) {
            throw new Error('Sender is not the owner of the contract.');
        }
    }

    private async sortFarms(
        stakeAddresses: string[],
        stakingFarmsSorting: StakingFarmsSortingArgs,
    ): Promise<string[]> {
        let sortFieldData = [];

        switch (stakingFarmsSorting.sortField) {
            case StakingFarmsSortableFields.PRICE:
                sortFieldData = await Promise.all(
                    stakeAddresses.map((address) =>
                        this.stakingCompute.computeFarmingTokenPriceUSD(
                            address,
                        ),
                    ),
                );
                break;
            case StakingFarmsSortableFields.APR:
                sortFieldData = await Promise.all(
                    stakeAddresses.map((address) =>
                        this.stakingCompute.stakeFarmAPR(address),
                    ),
                );
                break;
            case StakingFarmsSortableFields.TVL:
                sortFieldData = await Promise.all(
                    stakeAddresses.map((address) =>
                        this.stakingCompute.stakedValueUSD(address),
                    ),
                );
                break;
            case StakingFarmsSortableFields.DEPLOYED_AT:
                sortFieldData = await Promise.all(
                    stakeAddresses.map((address) =>
                        this.stakingCompute.deployedAt(address),
                    ),
                );
                break;
            default:
                break;
        }

        const combined = stakeAddresses.map((address, index) => ({
            address: address,
            sortValue: new BigNumber(sortFieldData[index]),
        }));

        combined.sort((a, b) => {
            if (stakingFarmsSorting.sortOrder === SortingOrder.ASC) {
                return a.sortValue.comparedTo(b.sortValue);
            }

            return b.sortValue.comparedTo(a.sortValue);
        });

        return combined.map((item) => item.address);
    }
}
