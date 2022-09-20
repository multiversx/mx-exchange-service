import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { Energy } from '../models/simple.lock.energy.model';

@Injectable()
export class EnergyComputeService {
    depleteUserEnergy(energyEntry: Energy, currentEpoch: number): Energy {
        if (energyEntry.lastUpdateEpoch === currentEpoch) {
            energyEntry;
        }

        if (
            new BigNumber(energyEntry.totalLockedTokens).isPositive() &&
            energyEntry.lastUpdateEpoch > 0
        ) {
            if (energyEntry.lastUpdateEpoch >= currentEpoch) {
                return energyEntry;
            }

            const epcohDiff = currentEpoch - energyEntry.lastUpdateEpoch;
            const energyDecrease = new BigNumber(
                energyEntry.totalLockedTokens,
            ).multipliedBy(epcohDiff);
            energyEntry.amount = new BigNumber(energyEntry.amount)
                .minus(energyDecrease)
                .toFixed();
        }

        return energyEntry;
    }
}
