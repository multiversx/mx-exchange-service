import { Injectable } from '@nestjs/common';
import { FarmModel } from 'src/modules/farm/models/farm.v2.model';
import { Farms } from '../../interfaces/dex_state.interfaces';
import { StateStore } from '../state.store';

@Injectable()
export class FarmsStateHandler {
    constructor(private readonly stateStore: StateStore) {}

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

            const farm: Partial<FarmModel> = {};
            for (const field of fields) {
                farm[field] = stateFarm[field];
            }

            result.farms.push(farm as FarmModel);
        }

        return result;
    }

    getAllFarms(fields: string[] = []): Farms {
        return this.getFarms(Array.from(this.stateStore.farms.keys()), fields);
    }
}
