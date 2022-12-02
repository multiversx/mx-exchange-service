import { Injectable } from '@nestjs/common';
import { farmVersion } from 'src/utils/farm.utils';
import { FarmSetterService } from './base-module/services/farm.setter.service';
import { FarmVersion } from './models/farm.model';
import { FarmSetterServiceV1_2 } from './v1.2/services/farm.v1.2.setter.service';
import { FarmSetterServiceV1_3 } from './v1.3/services/farm.v1.3.setter.service';
import { FarmSetterServiceV2 } from './v2/services/farm.v2.setter.service';

@Injectable()
export class FarmSetterFactory {
    constructor(
        private readonly farmSetterV1_2: FarmSetterServiceV1_2,
        private readonly farmSetterV1_3: FarmSetterServiceV1_3,
        private readonly farmSetterV2: FarmSetterServiceV2,
    ) {}

    useSetter(farmAddress: string): FarmSetterService {
        switch (farmVersion(farmAddress)) {
            case FarmVersion.V1_2:
                return this.farmSetterV1_2;
            case FarmVersion.V1_3:
                return this.farmSetterV1_3;
            case FarmVersion.V2:
                return this.farmSetterV2;
            default:
                throw new Error(`${farmAddress} is not a known farm address`);
        }
    }
}
