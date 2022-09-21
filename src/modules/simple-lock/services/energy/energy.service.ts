import { Injectable } from '@nestjs/common';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { Energy } from '../models/simple.lock.energy.model';
import { EnergyComputeService } from './energy.compute.service';
import { EnergyGetterService } from './energy.getter.service';

@Injectable()
export class EnergyService {
    constructor(
        private readonly energyGetter: EnergyGetterService,
        private readonly energyCompute: EnergyComputeService,
        private readonly contextGetter: ContextGetterService,
    ) {}

    async getUserEnergy(userAddress: string): Promise<Energy> {
        const [userEnergyEntry, currentEpoch] = await Promise.all([
            this.energyGetter.getEnergyEntryForUser(userAddress),
            this.contextGetter.getCurrentEpoch(),
        ]);
        return this.energyCompute.depleteUserEnergy(
            userEnergyEntry,
            currentEpoch,
        );
    }
}
