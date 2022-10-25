import { Injectable } from '@nestjs/common';
import { oneHour } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { farmsAddresses, farmVersion } from 'src/utils/farm.utils';
import { FarmGetterService } from './base-module/services/farm.getter.service';
import { FarmVersion } from './models/farm.model';
import { FarmGetterServiceV1_2 } from './v1.2/services/farm.v1.2.getter.service';
import { FarmGetterServiceV1_3 } from './v1.3/services/farm.v1.3.getter.service';
import { FarmGetterServiceV2 } from './v2/services/farm.v2.getter.service';

@Injectable()
export class FarmGetterFactory {
    constructor(
        private readonly farmGetterV1_2: FarmGetterServiceV1_2,
        private readonly farmGetterV1_3: FarmGetterServiceV1_3,
        private readonly farmGetterV2: FarmGetterServiceV2,
        private readonly cachingService: CachingService,
    ) {}

    useGetter(farmAddress: string): FarmGetterService {
        switch (farmVersion(farmAddress)) {
            case FarmVersion.V1_2:
                return this.farmGetterV1_2;
            case FarmVersion.V1_3:
                return this.farmGetterV1_3;
            case FarmVersion.V2:
                return this.farmGetterV2;
        }
    }

    async isFarmToken(tokenID: string): Promise<boolean> {
        for (const farmAddress of farmsAddresses()) {
            const farmTokenID = await this.useGetter(
                farmAddress,
            ).getFarmTokenID(farmAddress);
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
            const farmTokenID = await this.useGetter(
                farmAddress,
            ).getFarmTokenID(farmAddress);
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
}
