import { Injectable } from '@nestjs/common';
import { FarmVersion } from './models/farm.model';
import { farmType, farmVersion, farmsAddresses } from 'src/utils/farm.utils';
import { FarmModelV1_2 } from './models/farm.v1.2.model';
import { FarmModelV1_3 } from './models/farm.v1.3.model';
import { FarmCustomModel } from './models/farm.custom.model';
import { FarmsUnion } from './models/farm.union';
import { FarmServiceV1_2 } from './v1.2/services/farm.v1.2.service';
import { FarmServiceV1_3 } from './v1.3/services/farm.v1.3.service';
import { FarmServiceV2 } from './v2/services/farm.v2.service';
import { FarmServiceBase } from './base-module/services/farm.base.service';
import { FarmModelV2 } from './models/farm.v2.model';
import { ContextTracker } from '@multiversx/sdk-nestjs-common';
import { FarmAbiServiceV1_2 } from './v1.2/services/farm.v1.2.abi.service';

@Injectable()
export class FarmFactoryService {
    constructor(
        private readonly farmServiceV1_2: FarmServiceV1_2,
        private readonly farmServiceV1_3: FarmServiceV1_3,
        private readonly farmServiceV2: FarmServiceV2,
        private readonly farmAbi: FarmAbiServiceV1_2,
    ) {}

    async getFarmsAddresses(versions?: string[]): Promise<string[]> {
        let addresses = farmsAddresses(versions);

        const context = ContextTracker.get();
        if (context && context.deepHistoryTimestamp) {
            const farmsDeployedTimestamps = await Promise.all(
                addresses.map((address) =>
                    this.farmAbi.farmDeployedTimestamp(address),
                ),
            );
            addresses = addresses.filter((_, index) => {
                return (
                    farmsDeployedTimestamps[index] !== undefined &&
                    farmsDeployedTimestamps[index] <=
                        context.deepHistoryTimestamp
                );
            });
        }

        return addresses;
    }

    async getFarms(): Promise<Array<typeof FarmsUnion>> {
        const farms: Array<typeof FarmsUnion> = [];
        const farmsAddresses = await this.getFarmsAddresses();
        for (const address of farmsAddresses) {
            const version = farmVersion(address);
            switch (version) {
                case FarmVersion.V1_2:
                    farms.push(
                        new FarmModelV1_2({
                            address,
                            version,
                        }),
                    );
                    break;
                case FarmVersion.V1_3:
                    farms.push(
                        new FarmModelV1_3({
                            address,
                            version,
                            rewardType: farmType(address),
                        }),
                    );
                    break;
                case FarmVersion.V2:
                    farms.push(
                        new FarmModelV2({
                            address,
                            version,
                            rewardType: farmType(address),
                        }),
                    );
                    break;
                case FarmVersion.CUSTOM:
                    farms.push(
                        new FarmCustomModel({
                            address,
                            version,
                        }),
                    );
                    break;
            }
        }

        return farms;
    }

    useService(farmAddress: string): FarmServiceBase {
        switch (farmVersion(farmAddress)) {
            case FarmVersion.V1_2:
                return this.farmServiceV1_2;
            case FarmVersion.V1_3:
                return this.farmServiceV1_3;
            case FarmVersion.V2:
                return this.farmServiceV2;
            default:
                throw new Error(`${farmAddress} is not a known farm address`);
        }
    }
}
