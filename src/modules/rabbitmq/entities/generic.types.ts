import BigNumber from 'bignumber.js';

export enum PAIR_EVENTS {
    SWAP_FIXED_INPUT = 'swapTokensFixedInput',
    SWAP_FIXED_OUTPUT = 'swapTokensFixedOutput',
    ADD_LIQUIDITY = 'addLiquidity',
    REMOVE_LIQUIDITY = 'removeLiquidity',
    SWAP_NO_FEE = 'swapNoFeeAndForward',
}
export enum FARM_EVENTS {
    ENTER_FARM = 'enterFarm',
    EXIT_FARM = 'exitFarm',
    CLAIM_REWARDS = 'claimRewards',
    COMPOUND_REWARDS = 'compoundRewards',
}
export enum PROXY_EVENTS {
    ADD_LIQUIDITY_PROXY = 'addLiquidityProxy',
    REMOVE_LIQUIDITY_PROXY = 'removeLiquidityProxy',
    ENTER_FARM_PROXY = 'enterFarmProxy',
    EXIT_FARM_PROXY = 'exitFarmProxy',
    CLAIM_REWARDS_PROXY = 'claimRewardsFarmProxy',
    COMPOUND_REWARDS_PROXY = 'compoundRewardsFarmProxy',
}

export type GenericEventType = {
    address: string;
    caller: string;
    block: number;
    epoch: number;
    timestamp: number;
};

export type FftTokenAmountPairType = {
    tokenID: string;
    amount: BigNumber;
};

export type GenericTokenAmountPairType = {
    tokenID: string;
    tokenNonce: BigNumber;
    amount: BigNumber;
};
