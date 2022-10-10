import { Injectable } from '@nestjs/common';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { EnergyModel } from '../../models/simple.lock.model';
import { EnergyAbiService } from './energy.abi.service';
import { EnergyComputeService } from './energy.compute.service';
import { EnergyGetterService } from './energy.getter.service';

@Injectable()
export class EnergyService {
    constructor(
        private readonly energyAbi: EnergyAbiService,
        private readonly energyGetter: EnergyGetterService,
        private readonly energyCompute: EnergyComputeService,
        private readonly contextGetter: ContextGetterService,
    ) {}

    async getUserEnergy(
        userAddress: string,
        vmQuery = false,
    ): Promise<EnergyModel> {
        if (vmQuery) {
            const userEnergyEntry = await this.energyAbi.getEnergyEntryForUser(
                userAddress,
            );
            return new EnergyModel(userEnergyEntry);
        }
        const [userEnergyEntry, currentEpoch] = await Promise.all([
            this.energyGetter.getEnergyEntryForUser(userAddress),
            this.contextGetter.getCurrentEpoch(),
        ]);

        const depletedEnergy = this.energyCompute.depleteUserEnergy(
            userEnergyEntry,
            currentEpoch,
        );

        return new EnergyModel(depletedEnergy);
    }
}
