import { scAddress } from '../config';
import { GovernanceProposalStatus } from '../modules/governance/models/governance.proposal.model';
import { registerEnumType } from '@nestjs/graphql';

export enum GovernanceType {
    ENERGY = 'energy',
    OLD_ENERGY = 'oldEnergy',
    TOKEN_SNAPSHOT = 'tokenSnapshot',
}

registerEnumType(GovernanceType, { name: 'GovernanceType' });

const toTypeEnum = (type: string): GovernanceType => {
    switch (type) {
        case GovernanceType.ENERGY.toString():
            return GovernanceType.ENERGY;
        case GovernanceType.TOKEN_SNAPSHOT.toString():
            return GovernanceType.TOKEN_SNAPSHOT;
        case GovernanceType.OLD_ENERGY.toString():
            return GovernanceType.OLD_ENERGY;
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


export const toGovernanceProposalStatus = (status: string): GovernanceProposalStatus => {
    switch (status) {
        case 'None':
            return GovernanceProposalStatus.None;
        case 'Pending':
            return GovernanceProposalStatus.Pending;
        case 'Active':
            return GovernanceProposalStatus.Active;
        case 'Defeated':
            return GovernanceProposalStatus.Defeated;
        case 'DefeatedWithVeto':
            return GovernanceProposalStatus.DefeatedWithVeto;
        case 'Succeeded':
            return GovernanceProposalStatus.Succeeded;
        default:
            return undefined;
    }
};
