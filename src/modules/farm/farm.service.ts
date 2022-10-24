import { Inject, Injectable } from '@nestjs/common';
import { FarmVersion } from './models/farm.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { oneHour } from '../../helpers/helpers';
import { farmsAddresses, farmType, farmVersion } from 'src/utils/farm.utils';
import { CachingService } from 'src/services/caching/cache.service';
import { FarmModelV1_2 } from './models/farm.v1.2.model';
import { FarmModelV1_3 } from './models/farm.v1.3.model';
import { FarmCustomModel } from './models/farm.custom.model';
import { FarmsUnion } from './models/farm.union';
import { FarmGetterServiceV1_2 } from './v1.2/services/farm.v1.2.getter.service';
import { FarmGetterServiceV1_3 } from './v1.3/services/farm.v1.3.getter.service';
import { FarmGetterServiceV2 } from './v2/services/farm.v2.getter.service';
import { FarmGetterService } from './base-module/services/farm.getter.service';
import { FarmServiceV1_2 } from './v1.2/services/farm.v1.2.service';
import { FarmServiceV1_3 } from './v1.3/services/farm.v1.3.service';
import { FarmServiceV2 } from './v2/services/farm.v2.service';
import { FarmServiceBase } from './base-module/services/farm.base.service';
import { FarmComputeServiceV1_2 } from './v1.2/services/farm.v1.2.compute.service';
import { FarmComputeServiceV1_3 } from './v1.3/services/farm.v1.3.compute.service';
import { FarmComputeService } from './base-module/services/farm.compute.service';
import { FarmComputeServiceV2 } from './v2/services/farm.v2.compute.service';
import { TransactionsFarmService } from './base-module/services/farm.transaction.service';
import { FarmTransactionServiceV1_2 } from './v1.2/services/farm.v1.2.transaction.service';
import { FarmTransactionServiceV1_3 } from './v1.3/services/farm.v1.3.transaction.service';
import { FarmTransactionServiceV2 } from './v2/services/farm.v2.transaction.service';

@Injectable()
export class FarmFactoryService {
    constructor(
        private readonly farmServiceV1_2: FarmServiceV1_2,
        private readonly farmServiceV1_3: FarmServiceV1_3,
        private readonly farmServiceV2: FarmServiceV2,
        private readonly farmGetterV1_2: FarmGetterServiceV1_2,
        private readonly farmGetterV1_3: FarmGetterServiceV1_3,
        private readonly farmGetterV2: FarmGetterServiceV2,
        private readonly farmComputeV1_2: FarmComputeServiceV1_2,
        private readonly farmComputeV1_3: FarmComputeServiceV1_3,
        private readonly farmComputeV2: FarmComputeServiceV2,
        private readonly transactionsV1_2: FarmTransactionServiceV1_2,
        private readonly transactionsV1_3: FarmTransactionServiceV1_3,
        private readonly transactionsV2: FarmTransactionServiceV2,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    getFarms(): Array<typeof FarmsUnion> {
        const farms: Array<typeof FarmsUnion> = [];
        for (const address of farmsAddresses()) {
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
                default:
                    farms.push(
                        new FarmCustomModel({
                            address,
                        }),
                    );
                    break;
            }
        }

        return farms;
    }

    async isFarmToken(tokenID: string): Promise<boolean> {
        for (const farmAddress of farmsAddresses()) {
            const farmTokenID = await this.getter(farmAddress).getFarmTokenID(
                farmAddress,
            );
            if (tokenID === farmTokenID) {
                return true;
            }
        }
        return false;
    }

    async getFarmAddressByFarmTokenID(
        tokenID: string,
    ): Promise<string | undefined> {
        const cachedValue: string = await this.cachingService.getCache(
            `${tokenID}.farmAddress`,
        );
        if (cachedValue && cachedValue !== undefined) {
            return cachedValue;
        }
        for (const farmAddress of farmsAddresses()) {
            const farmTokenID = await this.getter(farmAddress).getFarmTokenID(
                farmAddress,
            );
            if (farmTokenID === tokenID) {
                await this.cachingService.setCache(
                    `${tokenID}.farmAddress`,
                    farmAddress,
                    oneHour(),
                );
                return farmAddress;
            }
        }
        return undefined;
    }

    getter(farmAddress: string): FarmGetterService {
        switch (farmVersion(farmAddress)) {
            case FarmVersion.V1_2:
                return this.farmGetterV1_2;
            case FarmVersion.V1_3:
                return this.farmGetterV1_3;
            case FarmVersion.V2:
                return this.farmGetterV2;
        }
    }

    service(farmAddress: string): FarmServiceBase {
        switch (farmVersion(farmAddress)) {
            case FarmVersion.V1_2:
                return this.farmServiceV1_2;
            case FarmVersion.V1_3:
                return this.farmServiceV1_3;
            case FarmVersion.V2:
                return this.farmServiceV2;
        }
    }

    compute(farmAddress: string): FarmComputeService {
        switch (farmVersion(farmAddress)) {
            case FarmVersion.V1_2:
                return this.farmComputeV1_2;
            case FarmVersion.V1_3:
                return this.farmComputeV1_3;
            case FarmVersion.V2:
                return this.farmComputeV2;
        }
    }

    transaction(farmAddress: string): TransactionsFarmService {
        switch (farmVersion(farmAddress)) {
            case FarmVersion.V1_2:
                return this.transactionsV1_2;
            case FarmVersion.V1_3:
                return this.transactionsV1_3;
            case FarmVersion.V2:
                return this.transactionsV2;
        }
    }
}
