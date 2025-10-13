export enum TRACKED_PAIR_FIELDS {
    firstTokenReserve = 'reserves0',
    secondTokenReserve = 'reserves1',
    totalSupply = 'totalSupply',
    state = 'state',
    totalFeePercent = 'totalFeePercent',
    specialFeePercent = 'specialFeePercent',
    lpTokenID = 'lpTokenID',
}

export type PairStateChanges = Partial<Record<TRACKED_PAIR_FIELDS, any>>;
