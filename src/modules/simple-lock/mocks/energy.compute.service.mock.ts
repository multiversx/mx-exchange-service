import { EnergyType } from '@elrondnetwork/erdjs-dex';
import { IEnergyComputeService } from "../interfaces";
import { ErrorNotImplemented } from "../../../utils/errors.constants";

export class EnergyComputeHandlers implements IEnergyComputeService {
    depleteUserEnergy:(
        energyEntry: EnergyType,
        currentEpoch: number,
    ) => EnergyType;
    constructor(init?: Partial<EnergyComputeHandlers>) {
        Object.assign(this, init);
    }
}

export class EnergyComputeServiceMock implements IEnergyComputeService {
    handlers: EnergyComputeHandlers;
    depleteUserEnergyCalled?:(
        energyEntry: EnergyType,
        currentEpoch: number,
    ) => EnergyType;

    depleteUserEnergy(energyEntry: EnergyType, currentEpoch: number): EnergyType {
        if (this.handlers.depleteUserEnergy !== undefined) {
            return this.handlers.depleteUserEnergy(energyEntry, currentEpoch);
        }
        ErrorNotImplemented()
    }

    constructor(init?: Partial<EnergyComputeHandlers>) {
        this.handlers = new EnergyComputeHandlers(init);
    }
}
