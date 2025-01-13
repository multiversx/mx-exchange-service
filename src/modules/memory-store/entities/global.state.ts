import { PairModel } from 'src/modules/pair/models/pair.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';

export enum GlobalStateInitStatus {
    NOT_STARTED = 'NOT_STARTED',
    IN_PROGRESS = 'IN_PROGRESS',
    DONE = 'DONE',
    FAILED = 'FAILED',
}

export enum PairFieldsType {
    tokensFarms = 'tokensFarms',
    analytics = 'analytics',
    info = 'info',
    prices = 'prices',
}

export enum TokenFieldsType {
    metadata = 'metadata',
    price = 'price',
    extra = 'extra',
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
    public pairsLastUpdate: { [key: string]: Record<PairFieldsType, number> } =
        {};
    public tokensState: { [key: string]: EsdtToken } = {};
    public tokensLastUpdate: {
        [key: string]: Record<TokenFieldsType, number>;
    } = {};
    public initStatus: GlobalStateInitStatus =
        GlobalStateInitStatus.NOT_STARTED;

    public getPairsArray(): PairModel[] {
        return Object.values(this.pairsState);
    }
}

export const GlobalState = new GlobalStateSingleton();
