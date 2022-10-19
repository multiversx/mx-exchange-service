import { EnergyType } from "@elrondnetwork/erdjs-dex";

export interface IEnergyComputeService {
    depleteUserEnergy(
        energyEntry: EnergyType,
        currentEpoch: number,
    ): EnergyType;
}