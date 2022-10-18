import { EnergyType } from "@elrondnetwork/erdjs-dex";
import { EnergyComputeService } from "../../../modules/simple-lock/services/energy/energy.compute.service";
import { ClaimProgress } from "../models/weekly-rewards-splitting.model"
import { IProgressComputeService } from "../interfaces";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ProgressComputeService implements IProgressComputeService {
    constructor(
        private readonly energyComputeService: EnergyComputeService,
    ) {
    }

    async advanceWeek(progress: ClaimProgress, nextWeekEnergy: EnergyType|undefined, epochsInWeek: number): Promise<ClaimProgress> {
        progress.week++;

        if (nextWeekEnergy !== undefined) {
            progress.energy = nextWeekEnergy;
            return progress;
        }

        const nextWeekEpoch = progress.energy.lastUpdateEpoch + epochsInWeek;
        progress.energy = await this.energyComputeService.depleteUserEnergy(progress.energy, nextWeekEpoch);
        return progress;
    }
}
