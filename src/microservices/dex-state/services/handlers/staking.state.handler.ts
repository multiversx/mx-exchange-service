import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import {
    GetFilteredStakingFarmsRequest,
    PaginatedStakingFarms,
    StakingFarms,
    StakingFarmSortField,
    StakingProxies,
    UpdateStakingFarmsRequest,
    UpdateStakingFarmsResponse,
    SortOrder,
} from '../../interfaces/dex_state.interfaces';
import { StakingComputeService } from '../compute/staking.compute.service';
import { StateStore } from '../state.store';

const STAKING_FARM_SORT_FIELD_MAP = {
    [StakingFarmSortField.STAKING_SORT_PRICE]: 'farmingTokenPriceUSD',
    [StakingFarmSortField.STAKING_SORT_TVL]: 'stakedValueUSD',
    [StakingFarmSortField.STAKING_SORT_APR]: 'apr',
    [StakingFarmSortField.STAKING_SORT_DEPLOYED_AT]: 'deployedAt',
};

@Injectable()
export class StakingStateHandler {
    constructor(
        private readonly stateStore: StateStore,
        private readonly stakingComputeService: StakingComputeService,
    ) {}

    getStakingFarms(addresses: string[], fields: string[] = []): StakingFarms {
        const result: StakingFarms = {
            stakingFarms: [],
        };

        for (const address of addresses) {
            const stateStakingFarm = this.stateStore.stakingFarms.get(address);

            if (!stateStakingFarm) {
                throw new Error(`Staking farm ${address} not found`);
            }

            if (fields.length === 0) {
                result.stakingFarms.push({ ...stateStakingFarm });
                continue;
            }

            const stakingFarm: Partial<StakingModel> = {};
            for (const field of fields) {
                stakingFarm[field] = stateStakingFarm[field];
            }

            result.stakingFarms.push(stakingFarm as StakingModel);
        }

        return result;
    }

    getAllStakingFarms(fields: string[] = []): StakingFarms {
        return this.getStakingFarms(
            Array.from(this.stateStore.stakingFarms.keys()),
            fields,
        );
    }

    getFilteredStakingFarms(
        request: GetFilteredStakingFarmsRequest,
    ): PaginatedStakingFarms {
        const fields = request.fields?.paths ?? [];

        const {
            searchToken,
            rewardsEnded,
            offset,
            limit,
            sortField,
            sortOrder,
        } = request;

        const stakingFarmAddresses: string[] = [];
        this.stateStore.stakingFarms.forEach((stakingFarm) => {
            if (searchToken && searchToken.trim().length > 0) {
                const farmingToken = this.stateStore.tokens.get(
                    stakingFarm.farmingTokenId,
                );
                const searchTerm = searchToken.toUpperCase().trim();

                if (
                    !farmingToken.name.toUpperCase().includes(searchTerm) &&
                    !farmingToken.identifier
                        .toUpperCase()
                        .includes(searchTerm) &&
                    !farmingToken.ticker.toUpperCase().includes(searchTerm)
                ) {
                    return;
                }
            }

            if (
                rewardsEnded !== undefined &&
                stakingFarm.isProducingRewards === rewardsEnded
            ) {
                return;
            }

            stakingFarmAddresses.push(stakingFarm.address);
        });

        if (sortField === StakingFarmSortField.STAKING_SORT_UNSPECIFIED) {
            const { stakingFarms } = this.getStakingFarms(
                stakingFarmAddresses.slice(offset, offset + limit),
                fields,
            );

            return {
                count: stakingFarmAddresses.length,
                stakingFarms,
            };
        }

        const decodedSortField = STAKING_FARM_SORT_FIELD_MAP[sortField];

        const sortedAddresses = stakingFarmAddresses
            .map((address) => {
                const stakingFarm = this.stateStore.stakingFarms.get(address);
                return {
                    address,
                    sortValue: new BigNumber(
                        stakingFarm?.[decodedSortField] ?? 0,
                    ),
                    rewardsEnded: !stakingFarm?.isProducingRewards ?? true,
                };
            })
            .sort((a, b) => {
                if (a.rewardsEnded !== b.rewardsEnded) {
                    return a.rewardsEnded ? 1 : -1;
                }

                if (sortOrder === SortOrder.SORT_ASC) {
                    return a.sortValue.comparedTo(b.sortValue);
                }
                return b.sortValue.comparedTo(a.sortValue);
            })
            .map((item) => item.address);

        const { stakingFarms } = this.getStakingFarms(
            sortedAddresses.slice(offset, offset + limit),
            fields,
        );

        return {
            count: sortedAddresses.length,
            stakingFarms,
        };
    }

    updateStakingFarms(
        request: UpdateStakingFarmsRequest,
    ): UpdateStakingFarmsResponse {
        const { stakingFarms: partialStakingFarms, updateMask } = request;

        const updatedStakingFarms = new Map<string, StakingModel>();
        const failedAddresses: string[] = [];

        const nonUpdateableFields = [
            'address',
            'rewardTokenId',
            'farmingTokenId',
            'farmTokenCollection',
        ];

        for (const partial of partialStakingFarms) {
            if (!partial.address) {
                continue;
            }

            const stakingFarm = this.stateStore.stakingFarms.get(
                partial.address,
            );

            if (!stakingFarm) {
                failedAddresses.push(partial.address);
                continue;
            }

            const updatedStakingFarm = { ...stakingFarm };

            for (const field of updateMask.paths) {
                if (partial[field] === undefined) {
                    continue;
                }

                if (nonUpdateableFields.includes(field)) {
                    continue;
                }

                updatedStakingFarm[field] = partial[field];
            }

            updatedStakingFarms.set(partial.address, updatedStakingFarm);
        }

        if (updatedStakingFarms.size > 0) {
            for (const [
                address,
                stakingFarm,
            ] of updatedStakingFarms.entries()) {
                const completeStakingFarm =
                    this.stakingComputeService.computeMissingStakingFarmFields(
                        stakingFarm,
                    );

                this.stateStore.setStakingFarm(address, {
                    ...completeStakingFarm,
                });

                if (!this.stateStore.stakingFarmsPairs.has(address)) {
                    continue;
                }

                const pair = this.stateStore.pairs.get(
                    this.stateStore.stakingFarmsPairs.get(address),
                );

                if (!pair) {
                    continue;
                }

                const updatedPair = { ...pair };

                updatedPair.compoundedAPR.dualFarmBaseAPR =
                    completeStakingFarm.baseApr;
                updatedPair.compoundedAPR.dualFarmBoostedAPR =
                    completeStakingFarm.maxBoostedApr;

                this.stateStore.setPair(pair.address, updatedPair);
            }
        }

        return {
            failedAddresses,
            updatedCount: updatedStakingFarms.size,
        };
    }

    getStakingProxies(
        addresses: string[],
        fields: string[] = [],
    ): StakingProxies {
        const result: StakingProxies = {
            stakingProxies: [],
        };

        for (const address of addresses) {
            const stateStakingProxy =
                this.stateStore.stakingProxies.get(address);

            if (!stateStakingProxy) {
                throw new Error(`Staking proxy ${address} not found`);
            }

            if (fields.length === 0) {
                result.stakingProxies.push({ ...stateStakingProxy });
                continue;
            }

            const stakingProxy: Partial<StakingProxyModel> = {};
            for (const field of fields) {
                stakingProxy[field] = stateStakingProxy[field];
            }

            result.stakingProxies.push(stakingProxy as StakingProxyModel);
        }

        return result;
    }

    getAllStakingProxies(fields: string[] = []): StakingProxies {
        return this.getStakingProxies(
            Array.from(this.stateStore.stakingProxies.keys()),
            fields,
        );
    }
}
