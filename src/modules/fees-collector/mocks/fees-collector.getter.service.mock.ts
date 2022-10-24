import { IFeesCollectorGetterService } from "../interfaces";
import { ErrorNotImplemented } from "../../../utils/errors.constants";

export class FeesCollectorGetterHandlers implements IFeesCollectorGetterService {
    getAccumulatedFees:(scAddress: string, week: number, token: string) => Promise<string>;
    getAllTokens:(scAddress: string) => Promise<string[]>;
    constructor(init?: Partial<FeesCollectorGetterServiceMock>) {
        Object.assign(this, init);
    }
}

export class FeesCollectorGetterServiceMock implements IFeesCollectorGetterService {
    handlers: FeesCollectorGetterHandlers;
    getAccumulatedFees(scAddress: string, week: number, token: string): Promise<string> {
        if (this.handlers.getAccumulatedFees !== undefined) {
            return this.handlers.getAccumulatedFees(scAddress, week, token);
        }
        ErrorNotImplemented()
    }

    getAllTokens(scAddress: string): Promise<string[]> {
        if (this.handlers.getAllTokens !== undefined) {
            return this.handlers.getAllTokens(scAddress);
        }
        ErrorNotImplemented()
    }
    constructor(init: Partial<FeesCollectorGetterHandlers>) {
        this.handlers = new FeesCollectorGetterHandlers(init);
    }
}
