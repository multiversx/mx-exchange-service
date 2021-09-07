import BigNumber from 'bignumber.js';

export enum PAIR_EVENTS {
    SWAP = 'swap',
    ADD_LIQUIDITY = 'add_liquidity',
    REMOVE_LIQUIDITY = 'remove_liquidity',
    SWAP_NO_FEE = 'swap_no_fee_and_forward',
}
export enum FARM_EVENTS {
    ENTER_FARM = 'enter_farm',
    EXIT_FARM = 'exit_farm',
    CLAIM_REWARDS = 'claim_rewards',
    COMPOUND_REWARDS = 'compound_rewards',
}
export enum PROXY_EVENTS {
    ADD_LIQUIDITY_PROXY = 'add_liquidity_proxy',
    REMOVE_LIQUIDITY_PROXY = 'remove_liquidity_proxy',
    ENTER_FARM_PROXY = 'enter_farm_proxy',
    EXIT_FARM_PROXY = 'exit_farm_proxy',
    CLAIM_REWARDS_PROXY = 'claim_rewards_farm_proxy',
    COMPOUND_REWARDS_PROXY = 'compound_rewards_farm_proxy',
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
