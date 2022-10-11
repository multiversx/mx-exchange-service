import { EnergyType } from "@elrondnetwork/erdjs-dex";
import { EnergyComputeService } from "../../../modules/simple-lock/services/energy/energy.compute.service";
import { ClaimProgress } from "../models/weekly-rewards-splitting.model"

export class ProgressComputeService {
    constructor(
        private readonly energyComputeService: EnergyComputeService,
    ) {
    }

    advanceWeek(progress: ClaimProgress, nextWeekEnergy: EnergyType, epochsInWeek: number): ClaimProgress {
        progress.week++;

        if (nextWeekEnergy !== null) {
            progress.energy = nextWeekEnergy;
            return;
        }

        const nextWeekEpoch = progress.energy.lastUpdateEpoch + epochsInWeek;
        progress.energy = this.energyComputeService.depleteUserEnergy(progress.energy, nextWeekEpoch);
        return progress;
    }
}
