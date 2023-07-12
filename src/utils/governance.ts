import { GovernanceType } from '../modules/governance/models/governance.contract.model';
import { scAddress } from '../config';

const toTypeEnum = (type: string): GovernanceType => {
    switch (type) {
        case 'energy':
            return GovernanceType.ENERGY;
        case 'token':
            return GovernanceType.TOKEN;
        default:
            return undefined;
    }
};


export const governanceType = (governanceAddress: string): GovernanceType | undefined => {
    const govConfig = scAddress.governance
    const types = Object.keys(scAddress.governance);
    for (const type of types) {
        const address = govConfig[type].find(
            (address: string) => address === governanceAddress,
        );
        if (address !== undefined) {
            return toTypeEnum(type);
        }
    }
    return undefined;
};


export const governanceContractsAddresses = (types?: string[]): string[] => {
    const govConfig = scAddress.governance
    const addresses = [];
    if (types === undefined || types.length === 0) {
        types = Object.keys(govConfig)
    }
    for (const type of types) {
        addresses.push(...govConfig[type]);
    }
    return addresses;
};
