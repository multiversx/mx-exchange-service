import { PairModel } from 'src/modules/pair/models/pair.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';

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

    public getPairsTokens(enabledSwaps: boolean): EsdtToken[] {
        const pairAddresses = enabledSwaps
            ? Object.values(this.pairsState)
                  .filter((pair) => pair.state === 'Active')
                  .map((pair) => pair.address)
            : Object.values(this.pairsState).map((pair) => pair.address);

        let tokenIDs = [];
        pairAddresses.forEach((address) => {
            tokenIDs.push(
                this.pairsEsdtTokens[address].firstTokenID,
                this.pairsEsdtTokens[address].secondTokenID,
            );
        });

        tokenIDs = [...new Set(tokenIDs)];
        return tokenIDs.map((tokenID) => this.tokensState[tokenID]);
    }
}

export const GlobalState = new GlobalStateSingleton();
