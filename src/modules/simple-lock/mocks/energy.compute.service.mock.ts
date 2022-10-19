import { EnergyType } from '@elrondnetwork/erdjs-dex';
import { IEnergyComputeService } from "../interfaces";
import { ErrorNotImplemented } from "../../../utils/errors.constants";

export class EnergyComputeServiceMock implements IEnergyComputeService {
    depleteUserEnergyCalled:(
        energyEntry: EnergyType,
        currentEpoch: number,
    ) => EnergyType;

    depleteUserEnergy(energyEntry: EnergyType, currentEpoch: number): EnergyType {
        if (this.depleteUserEnergyCalled !== undefined) {
            return this.depleteUserEnergyCalled(energyEntry, currentEpoch);
        }
        throw ErrorNotImplemented
    }
    constructor(init?: Partial<EnergyComputeServiceMock>) {
        Object.assign(this, init);
    }
}
