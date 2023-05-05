import {
    IFarmAbiService,
    IFarmComputeService,
} from '../../base-module/services/interfaces';
import { FarmMigrationConfig } from '../../models/farm.model';

export interface IFarmAbiServiceV1_3 extends IFarmAbiService {
    farmMigrationConfiguration(
        farmAddress: string,
    ): Promise<FarmMigrationConfig>;
}

export interface IFarmComputeServiceV1_3 extends IFarmComputeService {
    farmAPR(farmAddress: string): Promise<string>;
}
