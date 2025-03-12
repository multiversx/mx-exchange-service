import { Injectable } from '@nestjs/common';
import { farmVersion, farmsAddresses } from 'src/utils/farm.utils';
import { FarmAbiService } from './base-module/services/farm.abi.service';
import { FarmVersion } from './models/farm.model';
import { FarmAbiServiceV1_2 } from './v1.2/services/farm.v1.2.abi.service';
import { FarmAbiServiceV1_3 } from './v1.3/services/farm.v1.3.abi.service';
import { FarmAbiServiceV2 } from './v2/services/farm.v2.abi.service';
import { CacheService } from 'src/services/caching/cache.service';
import { Constants } from '@multiversx/sdk-nestjs-common';

@Injectable()
export class FarmAbiFactory {
    constructor(
        private readonly abiServiceV1_2: FarmAbiServiceV1_2,
        private readonly abiServiceV1_3: FarmAbiServiceV1_3,
        private readonly abiServiceV2: FarmAbiServiceV2,
        private readonly cachingService: CacheService,
    ) {}

    useAbi(farmAddress: string): FarmAbiService {
        switch (farmVersion(farmAddress)) {
            case FarmVersion.V1_2:
                return this.abiServiceV1_2;
            case FarmVersion.V1_3:
                return this.abiServiceV1_3;
            case FarmVersion.V2:
                return this.abiServiceV2;
            default:
                return this.abiServiceV1_2;
        }
    }

    async isFarmToken(tokenID: string): Promise<boolean> {
        for (const farmAddress of farmsAddresses()) {
            const farmTokenID = await this.useAbi(farmAddress).farmTokenID(
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
        const cachedValue: string = await this.cachingService.get(
            `${tokenID}.farmAddress`,
        );
        if (cachedValue && cachedValue !== undefined) {
            return cachedValue;
        }
        for (const farmAddress of farmsAddresses()) {
            const farmTokenID = await this.useAbi(farmAddress).farmTokenID(
                farmAddress,
            );
            if (farmTokenID === tokenID) {
                await this.cachingService.set(
                    `${tokenID}.farmAddress`,
                    farmAddress,
                    Constants.oneHour(),
                );
                return farmAddress;
            }
        }
        return undefined;
    }
}
