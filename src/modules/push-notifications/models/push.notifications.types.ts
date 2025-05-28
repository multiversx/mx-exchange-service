export interface EnergyDetailsType {
    lastUpdateEpoch: number;
    amount: string;
    totalLockedTokens: string;
}

export interface AccountType {
    address: string;
    nonce: number;
    balance: string;
    balanceNum: number;
    totalBalanceWithStake: string;
    totalBalanceWithStakeNum: number;
    timestamp: number;
    shardID: number;
    totalStake: string;
    energy: string;
    energyNum: number;
    energyDetails: EnergyDetailsType;
    totalUnDelegate: string;
}

export interface NotificationResult {
    successful: string[];
    failed: string[];
}

export interface NotificationConfig {
    title: string;
    body: string;
    route: string;
    iconUrl: string;
}

export enum NotificationType {
    FEES_COLLECTOR_REWARDS = 'feesCollectorRewards',
    NEGATIVE_ENERGY = 'negativeEnergy',
}
