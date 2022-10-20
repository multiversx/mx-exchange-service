import { EnergyType } from "@elrondnetwork/erdjs-dex";
import { EsdtToken } from "../tokens/models/esdtToken.model";

export interface IEnergyComputeService {
    depleteUserEnergy(
        energyEntry: EnergyType,
        currentEpoch: number,
    ): EnergyType;
}

export interface IEnergyGetterService {
    getBaseAssetTokenID(): Promise<string>;
    getBaseAssetToken(): Promise<EsdtToken>;
    getLockOptions(): Promise<number[]>;
    getPauseState(): Promise<boolean>;
    getOwnerAddress(): Promise<string>;
    getEnergyEntryForUser(userAddress: string): Promise<EnergyType>;
}
