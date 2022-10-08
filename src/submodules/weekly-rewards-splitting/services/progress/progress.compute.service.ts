import { EnergyType } from "@elrondnetwork/erdjs-dex";
import { EnergyComputeService } from "../../../../modules/simple-lock/services/energy/energy.compute.service";
import { Field, ObjectType } from "@nestjs/graphql";
import { EnergyModel } from "../../../../modules/simple-lock/models/simple.lock.model";

@ObjectType()
export class ClaimProgress {
    @Field()
    energy: EnergyModel;

    @Field()
    week: number
}

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
