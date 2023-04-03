import { IFeesCollectorGetterService } from '../interfaces';
import { ErrorNotImplemented } from '../../../utils/errors.constants';

export class FeesCollectorGetterHandlers
    implements IFeesCollectorGetterService
{
    getAccumulatedFees: (
        scAddress: string,
        week: number,
        token: string,
    ) => Promise<string>;
    getAllTokens: (scAddress: string) => Promise<string[]>;
    getAccumulatedTokenForInflation: (
        scAddress: string,
        week: number,
    ) => Promise<string>;
    getLockedTokenId: (scAddress: string) => Promise<string>;
    getLockedTokensPerBlock: (scAddress: string) => Promise<string>;
    getCurrentWeek: (scAddress: string) => Promise<number>;

    constructor(init?: Partial<FeesCollectorGetterServiceMock>) {
        Object.assign(this, init);
    }
}

export class FeesCollectorGetterServiceMock
    implements IFeesCollectorGetterService
{
    handlers: FeesCollectorGetterHandlers;
    getAccumulatedFees(
        scAddress: string,
        week: number,
        token: string,
    ): Promise<string> {
        if (this.handlers.getAccumulatedFees !== undefined) {
            return this.handlers.getAccumulatedFees(scAddress, week, token);
        }
        ErrorNotImplemented();
    }

    getAllTokens(scAddress: string): Promise<string[]> {
        if (this.handlers.getAllTokens !== undefined) {
            return this.handlers.getAllTokens(scAddress);
        }
        ErrorNotImplemented();
    }

    getAccumulatedTokenForInflation(
        scAddress: string,
        week: number,
    ): Promise<string> {
        if (this.handlers.getAccumulatedTokenForInflation !== undefined) {
            return this.handlers.getAccumulatedTokenForInflation(
                scAddress,
                week,
            );
        }
        ErrorNotImplemented();
    }

    getLockedTokenId(scAddress: string): Promise<string> {
        if (this.handlers.getLockedTokenId !== undefined) {
            return this.handlers.getLockedTokenId(scAddress);
        }
        ErrorNotImplemented();
    }

    getLockedTokensPerBlock(scAddress: string): Promise<string> {
        if (this.handlers.getLockedTokensPerBlock !== undefined) {
            return this.handlers.getLockedTokensPerBlock(scAddress);
        }
        ErrorNotImplemented();
    }

    async getCurrentWeek(scAddress: string): Promise<number> {
        if (this.handlers.getCurrentWeek !== undefined) {
            return this.handlers.getCurrentWeek(scAddress);
        }
        ErrorNotImplemented();
    }

    constructor(init: Partial<FeesCollectorGetterHandlers>) {
        this.handlers = new FeesCollectorGetterHandlers(init);
    }
}
