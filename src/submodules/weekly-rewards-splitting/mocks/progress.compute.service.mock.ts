import { EnergyType } from "@elrondnetwork/erdjs-dex";
import { ClaimProgress } from "../models/weekly-rewards-splitting.model"
import { IProgressComputeService } from "../interfaces";
import { ErrorNotImplemented } from "../../../utils/errors.constants";

export class ProgressComputeServiceMock implements IProgressComputeService {
    advanceWeekCalled:(progress: ClaimProgress, nextWeekEnergy: EnergyType, epochsInWeek: number) => Promise<ClaimProgress>;

    advanceWeek(progress: ClaimProgress, nextWeekEnergy: EnergyType, epochsInWeek: number): Promise<ClaimProgress> {
        if (this.advanceWeekCalled !== undefined) {
            return this.advanceWeekCalled(progress, nextWeekEnergy, epochsInWeek);
        }
        throw ErrorNotImplemented
    }
    constructor(init?: Partial<ProgressComputeServiceMock>) {
        Object.assign(this, init);
    }
}
