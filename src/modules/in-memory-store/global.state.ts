import { PairModel } from '../pair/models/pair.model';
import { EsdtToken } from '../tokens/models/esdtToken.model';

export enum GlobalStateInitStatus {
    NOT_STARTED = 'NOT_STARTED',
    IN_PROGRESS = 'IN_PROGRESS',
    DONE = 'DONE',
    FAILED = 'FAILED',
}

export class PairEsdtTokens {
    firstTokenID: string;
    secondTokenID: string;
    lpTokenID: string;
    dualFarmRewardTokenID: string;

    constructor(init?: Partial<PairEsdtTokens>) {
        Object.assign(this, init);
    }
}

export class GlobalStateSingleton {
    public pairsState: { [key: string]: PairModel } = {};
    public pairsEsdtTokens: { [key: string]: PairEsdtTokens } = {};
    public tokensState: { [key: string]: EsdtToken } = {};
    public initStatus: GlobalStateInitStatus =
        GlobalStateInitStatus.NOT_STARTED;

    public getPairsArray(): PairModel[] {
        return Object.values(this.pairsState);
    }

    public getTokensArray(): EsdtToken[] {
        return Object.values(this.tokensState);
    }
}

export const GlobalState = new GlobalStateSingleton();
