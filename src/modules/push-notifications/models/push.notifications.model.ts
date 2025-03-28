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

export interface ContractKeysRaw {
    data: {
        blockInfo: {
            hash: string;
            nonce: number;
            rootHash: string;
        };
        pairs: Record<string, string>;
    };
    code: string;
}

export interface UserEnergyAddress {
    address: string;
    notificationSent: boolean;
}

export interface NotificationPayload {
    addresses: string[];
    chainId: number;
    title: string;
    body: string;
    route: string;
    iconUrl: string;
} 