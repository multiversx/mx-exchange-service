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
    public routerAddresses: string[] = [];
    public tokensState: { [key: string]: EsdtToken } = {};
    public tokensLastUpdate: {
        [key: string]: Record<TokenFieldsType, number>;
    } = {};
    public initStatus: GlobalStateInitStatus =
        GlobalStateInitStatus.NOT_STARTED;

    public getPairsArray(): PairModel[] {
        return this.routerAddresses.map((address) => this.pairsState[address]);
    }

    public getTokensArray(): EsdtToken[] {
        return Object.values(this.tokensState);
    }

    public getPairsTokens(enabledSwaps: boolean): EsdtToken[] {
        const pairs = enabledSwaps
            ? this.getPairsArray().filter((pair) => pair.state === 'Active')
            : this.getPairsArray();

        let tokenIDs = [];
        pairs.forEach((pair) => {
            tokenIDs.push(
                this.pairsEsdtTokens[pair.address].firstTokenID,
                this.pairsEsdtTokens[pair.address].secondTokenID,
            );
        });

        tokenIDs = [...new Set(tokenIDs)];
        return tokenIDs.map((tokenID) => this.tokensState[tokenID]);
    }
}

export const GlobalState = new GlobalStateSingleton();
