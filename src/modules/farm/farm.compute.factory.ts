import { Injectable } from '@nestjs/common';
import { farmVersion } from 'src/utils/farm.utils';
import { FarmComputeService } from './base-module/services/farm.compute.service';
import { FarmVersion } from './models/farm.model';
import { FarmComputeServiceV1_2 } from './v1.2/services/farm.v1.2.compute.service';
import { FarmComputeServiceV1_3 } from './v1.3/services/farm.v1.3.compute.service';
import { FarmComputeServiceV2 } from './v2/services/farm.v2.compute.service';

@Injectable()
export class FarmComputeFactory {
    constructor(
        private readonly farmComputeV1_2: FarmComputeServiceV1_2,
        private readonly farmComputeV1_3: FarmComputeServiceV1_3,
        private readonly farmComputeV2: FarmComputeServiceV2,
    ) {}

    useCompute(farmAddress: string): FarmComputeService {
        switch (farmVersion(farmAddress)) {
            case FarmVersion.V1_2:
                return this.farmComputeV1_2;
            case FarmVersion.V1_3:
                return this.farmComputeV1_3;
            case FarmVersion.V2:
                return this.farmComputeV2;
        }
    }
}
