import { farmsConfig } from 'src/config';
import {
    FarmRewardType,
    FarmVersion,
} from 'src/modules/farm/models/farm.model';

const toVersionEnum = (version: string): FarmVersion => {
    switch (version) {
        case 'v1.2':
            return FarmVersion.V1_2;
        case 'v1.3':
            return FarmVersion.V1_3;
        case 'v2':
            return FarmVersion.V2;
        case 'custom':
            return FarmVersion.CUSTOM;
        default:
            undefined;
    }
};

const toRewardTypeEnum = (rewardType: string): FarmRewardType => {
    switch (rewardType) {
        case 'unlockedRewards':
            return FarmRewardType.UNLOCKED_REWARDS;
        case 'lockedRewards':
            return FarmRewardType.LOCKED_REWARDS;
        case 'customRewards':
            return FarmRewardType.CUSTOM_REWARDS;
        case 'deprecated':
            return FarmRewardType.DEPRECATED;
    }
};

export const farmVersion = (farmAddress: string): FarmVersion | undefined => {
    const versions = Object.keys(farmsConfig);
    for (const version of versions) {
        if (Array.isArray(farmsConfig[version])) {
            const address = farmsConfig[version].find(
                (address: string) => address === farmAddress,
            );
            if (address !== undefined) {
                return toVersionEnum(version);
            }
        } else {
            const types = Object.keys(farmsConfig[version]);
            for (const type of types) {
                const address = farmsConfig[version][type].find(
                    (address: string) => address === farmAddress,
                );
                if (address !== undefined) {
                    return toVersionEnum(version);
                }
            }
        }
    }
    return undefined;
};

export const farmType = (farmAddress: string): FarmRewardType | undefined => {
    const versions = Object.keys(farmsConfig);
    for (const version of versions) {
        if (Array.isArray(farmsConfig[version])) {
            const address = farmsConfig[version].find(
                (address: string) => address === farmAddress,
            );
            if (address !== undefined) {
                return undefined;
            }
        } else {
            const types = Object.keys(farmsConfig[version]);
            for (const type of types) {
                const address = farmsConfig[version][type].find(
                    (address: string) => address === farmAddress,
                );
                if (address !== undefined) {
                    return toRewardTypeEnum(type);
                }
            }
        }
    }
    return undefined;
};

export const farmsAddresses = (versions?: string[]): string[] => {
    const addresses = [];
    if (versions === undefined || versions.length === 0) {
        versions = Object.keys(farmsConfig);
    }
    for (const version of versions) {
        if (Array.isArray(farmsConfig[version])) {
            addresses.push(...farmsConfig[version]);
        } else {
            const types = Object.keys(farmsConfig[version]);
            for (const type of types) {
                addresses.push(...farmsConfig[version][type]);
            }
        }
    }
    return addresses;
};
