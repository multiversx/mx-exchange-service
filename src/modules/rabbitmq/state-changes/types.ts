export type BlockWithStateChanges = {
    hash: string;
    shardID: number;
    nonce: number;
    timestampMs: number;
    stateAccessesPerAccounts: Record<
        string,
        { stateAccess: StateAccessPerAccountRaw[] }
    >;
};

export type StateAccessPerAccountRaw = {
    type: number;
    index: number;
    txHash: string;
    mainTrieKey: string;
    mainTrieVal: string;
    operation: number;
    dataTrieChanges?: DataTrieChange[];
    accountChanges?: number;
};

export type DataTrieChange = {
    type: number;
    key: string;
    val: string;
    version: number;
};

export enum TrackedPairFields {
    firstTokenReserve = 'reserves0',
    secondTokenReserve = 'reserves1',
    totalSupply = 'totalSupply',
    state = 'state',
    totalFeePercent = 'totalFeePercent',
    specialFeePercent = 'specialFeePercent',
    lpTokenID = 'lpTokenID',
}

export type PairStateChanges = Partial<Record<TrackedPairFields, any>>;
