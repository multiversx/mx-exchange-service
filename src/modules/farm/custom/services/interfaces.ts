import { IFarmAbiService } from '../../base-module/services/interfaces';

export interface IFarmCustomAbiService extends IFarmAbiService {
    whitelist(farmAddress: string): Promise<string[]>;
}
