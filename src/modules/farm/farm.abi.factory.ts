import { Injectable } from '@nestjs/common';
import { farmVersion } from 'src/utils/farm.utils';
import { AbiFarmService } from './base-module/services/farm.abi.service';
import { FarmVersion } from './models/farm.model';
import { FarmAbiServiceV1_2 } from './v1.2/services/farm.v1.2.abi.service';
import { FarmAbiServiceV1_3 } from './v1.3/services/farm.v1.3.abi.service';
import { FarmAbiServiceV2 } from './v2/services/farm.v2.abi.service';

@Injectable()
export class FarmAbiFactory {
    constructor(
        private readonly abiServiceV1_2: FarmAbiServiceV1_2,
        private readonly abiServiceV1_3: FarmAbiServiceV1_3,
        private readonly abiServiceV2: FarmAbiServiceV2,
    ) {}

    useAbi(farmAddress: string): AbiFarmService {
        switch (farmVersion(farmAddress)) {
            case FarmVersion.V1_2:
                return this.abiServiceV1_2;
            case FarmVersion.V1_3:
                return this.abiServiceV1_3;
            case FarmVersion.V2:
                return this.abiServiceV2;
        }
    }
}
