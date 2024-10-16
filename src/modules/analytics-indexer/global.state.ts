export class PairState {
    firstTokenID: string;
    secondTokenID: string;
    firstTokenReserves: string;
    secondTokenReserves: string;
    liquidityPoolSupply: string;
}

export class GlobalStateSingleton {
    public pairsState: { [key: string]: PairState } = {};
}

export const GlobalState = new GlobalStateSingleton();
