import { EnergyType } from '@elrondnetwork/erdjs-dex';
import { IProgressComputeService } from '../interfaces';
import { ErrorNotImplemented } from '../../../utils/errors.constants';
import { ClaimProgress } from '../models/weekly-rewards-splitting.model';

export class ProgressComputeHandlers implements IProgressComputeService {
    advanceWeek:(progress: ClaimProgress, nextWeekEnergy: EnergyType, epochsInWeek: number) => ClaimProgress;
    constructor(init: Partial<ProgressComputeHandlers>) {
        Object.assign(this, init);
    }
}

export class ProgressComputeServiceMock implements IProgressComputeService {
    handlers: ProgressComputeHandlers;
    advanceWeek(progress: ClaimProgress, nextWeekEnergy: EnergyType, epochsInWeek: number): ClaimProgress {
        if (this.handlers.advanceWeek !== undefined) {
            return this.handlers.advanceWeek(progress, nextWeekEnergy, epochsInWeek);
        }
        ErrorNotImplemented()
    }
    constructor(init: Partial<ProgressComputeHandlers>) {
        this.handlers = new ProgressComputeHandlers(init);
    }
}
