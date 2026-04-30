import { Injectable } from '@nestjs/common';
import { FarmModelV2 } from 'src/modules/farm/models/farm.v2.model';

const FARM_IMMUTABLE_FIELDS: ReadonlySet<keyof FarmModelV2> = new Set<
    keyof FarmModelV2
>(['address', 'farmedTokenId', 'farmingTokenId', 'farmTokenCollection', 'pairAddress']);
import {
    Farms,
    UpdateFarmsRequest,
    UpdateFarmsResponse,
} from '../../interfaces/dex_state.interfaces';
import { FarmComputeService } from '../compute/farm.compute.service';
import { StateStore } from '../state.store';

@Injectable()
export class FarmsStateHandler {
    constructor(
        private readonly stateStore: StateStore,
        private readonly farmComputeService: FarmComputeService,
    ) { }

    getFarms(addresses: string[], fields: string[] = []): Farms {
        const result: Farms = {
            farms: [],
        };

        for (const address of addresses) {
            const stateFarm = this.stateStore.farms.get(address);

            if (!stateFarm) {
                throw new Error(`Farm ${address} not found`);
            }

            if (fields.length === 0) {
                result.farms.push({ ...stateFarm });
                continue;
            }

            const farm: Partial<FarmModelV2> = {};
            for (const field of fields) {
                farm[field] = stateFarm[field];
            }

            result.farms.push(farm as FarmModelV2);
        }

        return result;
    }

    getAllFarms(fields: string[] = []): Farms {
        return this.getFarms(Array.from(this.stateStore.farms.keys()), fields);
    }

    updateFarms(request: UpdateFarmsRequest): UpdateFarmsResponse {
        const { farms: partialFarms, updateMask } = request;

        const updatedFarms = new Map<string, FarmModelV2>();
        const failedAddresses: string[] = [];

        for (const partial of partialFarms) {
            if (!partial.address) {
                continue;
            }

            const farm = this.stateStore.farms.get(partial.address);

            if (!farm) {
                failedAddresses.push(partial.address);
                continue;
            }

            const updatedFarm = { ...farm };

            for (const field of updateMask.paths) {
                if (!Object.prototype.hasOwnProperty.call(partial, field)) {
                    continue;
                }

                if (FARM_IMMUTABLE_FIELDS.has(field as keyof FarmModelV2)) {
                    continue;
                }
                updatedFarm[field] = partial[field];
            }

            updatedFarms.set(partial.address, updatedFarm);
        }

        if (updatedFarms.size > 0) {
            for (const [address, farm] of updatedFarms.entries()) {
                const completeFarm =
                    this.farmComputeService.computeMissingFarmFields(farm);

                this.stateStore.setFarm(address, { ...completeFarm });

                if (!this.stateStore.farmsPairs.has(address)) {
                    continue;
                }

                const pair = this.stateStore.pairs.get(
                    this.stateStore.farmsPairs.get(address),
                );

                if (!pair) {
                    continue;
                }

                const updatedPair = { ...pair };
                updatedPair.compoundedAPR = { ...updatedPair.compoundedAPR };

                updatedPair.compoundedAPR.farmBaseAPR = completeFarm.baseApr;
                updatedPair.compoundedAPR.farmBoostedAPR =
                    completeFarm.boostedApr;

                this.stateStore.setPair(pair.address, updatedPair);
            }
        }

        return {
            failedAddresses,
            updatedCount: updatedFarms.size,
        };
    }
}
