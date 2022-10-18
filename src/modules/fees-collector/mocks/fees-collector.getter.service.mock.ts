import { IFeesCollectorGetterService } from "../interfaces";
import { ErrorNotImplemented } from "../../../utils/errors.constants";

export class FeesCollectorGetterServiceMock implements IFeesCollectorGetterService {
    getAccumulatedFeesCalled:(scAddress: string, week: number, token: string) => Promise<string>;
    getAllTokensCalled:(scAddress: string) => Promise<string[]>;

    getAccumulatedFees(scAddress: string, week: number, token: string): Promise<string> {
        if (this.getAccumulatedFeesCalled !== undefined) {
            return this.getAccumulatedFeesCalled(scAddress, week, token);
        }
        throw ErrorNotImplemented
    }

    getAllTokens(scAddress: string): Promise<string[]> {
        if (this.getAllTokensCalled !== undefined) {
            return this.getAllTokensCalled(scAddress);
        }
        throw ErrorNotImplemented
    }
    constructor(init?: Partial<FeesCollectorGetterServiceMock>) {
        Object.assign(this, init);
    }
}