export enum IndexerEventIdentifiers {
    SWAP_FIXED_INPUT = 'swapTokensFixedInput',
    SWAP_FIXED_OUTPUT = 'swapTokensFixedOutput',
    ADD_LIQUIDITY = 'addLiquidity',
    ADD_INITIAL_LIQUIDITY = 'addInitialLiquidity',
    REMOVE_LIQUIDITY = 'removeLiquidity',
    PRICE_DISCOVERY_DEPOSIT = 'deposit',
    PRICE_DISCOVERY_WITHDRAW = 'withdraw',
    EXIT_FARM = 'exitFarm',
    ESDT_LOCAL_BURN = 'ESDTLocalBurn',
}

export enum IndexerEventTypes {
    SWAP_EVENTS = 'SWAP_EVENTS',
    LIQUIDITY_EVENTS = 'LIQUIDITY_EVENTS',
    PRICE_DISCOVERY_EVENTS = 'PRICE_DISCOVERY_EVENTS',
    MEX_FEE_BURN_EVENTS = 'MEX_FEE_BURN_EVENTS',
    MEX_PENALTY_BURN_EVENTS = 'MEX_PENALTY_BURN_EVENTS',
}
