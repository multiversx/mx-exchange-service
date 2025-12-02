export const protobufPackage = 'pairs';

export interface PairInfo {
    reserves0: string;
    reserves1: string;
    totalSupply: string;
}

export interface FeeDestination {
    address: string;
    tokenID: string;
}

export interface Pair {
    address: string;
    firstTokenId: string;
    firstTokenPrice: string;
    firstTokenPriceUSD: string;
    firstTokenLockedValueUSD: string;
    secondTokenId: string;
    secondTokenPrice: string;
    secondTokenPriceUSD: string;
    secondTokenLockedValueUSD: string;
    liquidityPoolTokenId: string;
    liquidityPoolTokenPriceUSD: string;
    lockedValueUSD: string;
    previous24hLockedValueUSD: string;
    firstTokenVolume24h: string;
    secondTokenVolume24h: string;
    volumeUSD24h: string;
    previous24hVolumeUSD: string;
    feesUSD24h: string;
    previous24hFeesUSD: string;
    feesAPR: string;
    info: PairInfo | undefined;
    totalFeePercent: number;
    specialFeePercent: number;
    feesCollectorCutPercentage: number;
    trustedSwapPairs: string[];
    type: string;
    state: string;
    feeState: boolean;
    whitelistedManagedAddresses: string[];
    initialLiquidityAdder: string;
    feeDestinations: FeeDestination[];
    hasFarms: boolean;
    hasDualFarms: boolean;
    tradesCount: number;
    tradesCount24h: number;
    deployedAt: number;
    farmAddress: string;
    stakingProxyAddress: string;
    stakingFarmAddress: string;
    feesCollectorAddress: string;
}

export const PAIRS_PACKAGE_NAME = 'pairs';
