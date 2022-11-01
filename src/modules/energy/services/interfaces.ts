import { EnergyType } from '@elrondnetwork/erdjs-dex';
import { EsdtToken } from '../../tokens/models/esdtToken.model';
import { LockOption } from '../models/simple.lock.energy.model';

export interface IEnergyComputeService {
    depleteUserEnergy(
        energyEntry: EnergyType,
        currentEpoch: number,
    ): EnergyType;
}

export interface IEnergyGetterService {
    getBaseAssetTokenID(): Promise<string>;
    getBaseAssetToken(): Promise<EsdtToken>;
    getLockOptions(): Promise<LockOption[]>;
    getPauseState(): Promise<boolean>;
    getOwnerAddress(): Promise<string>;
    getEnergyEntryForUser(userAddress: string): Promise<EnergyType>;
}
