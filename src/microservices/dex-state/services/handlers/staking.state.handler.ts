import { Injectable } from '@nestjs/common';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import {
    StakingFarms,
    StakingProxies,
} from '../../interfaces/dex_state.interfaces';
import { StateStore } from '../state.store';

@Injectable()
export class StakingStateHandler {
    constructor(private readonly stateStore: StateStore) {}

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
