// import { FarmAbiService } from '../base-module/services/farm.abi.service';
import { FarmAbiService } from '../base-module/services/farm.abi.service';
import { FarmAbiFactory } from '../farm.abi.factory';
import { FarmAbiServiceMock } from './farm.abi.service.mock';
// import { FarmAbiServiceMockV1_2 } from "./farm.v1.2.abi.service.mock";
// import { FarmAbiServiceMockV1_3 } from "./farm.v1.3.abi.service.mock";
// import { FarmAbiServiceMockV2 } from "./farm.v2.abi.service.mock";

export class FarmAbiFactoryMock {
    constructor(
        // private readonly abiServiceV1_2: FarmAbiServiceMockV1_2,
        // private readonly abiServiceV1_3: FarmAbiServiceMockV1_3,
        // private readonly abiServiceV2: FarmAbiServiceMockV2,
        private readonly abiService: FarmAbiServiceMock,
    ) {}

    useAbi(farmAddress: string): FarmAbiServiceMock {
        return this.abiService;
    }
}

export const FarmAbiFactoryServiceProvider = {
    provide: FarmAbiFactory,
    useClass: FarmAbiServiceMock,
};
