import { Injectable } from '@nestjs/common';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import {
    StakingFarms,
    StakingProxies,
    UpdateStakingFarmsRequest,
    UpdateStakingFarmsResponse,
} from '../../interfaces/dex_state.interfaces';
import { StakingComputeService } from '../compute/staking.compute.service';
import { StateStore } from '../state.store';

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
                        this.stateStore,
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
