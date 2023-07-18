import { GovernanceType } from '../modules/governance/models/energy.contract.model';
import { scAddress } from '../config';
import { GovernanceProposalStatus } from '../modules/governance/models/governance.proposal.model';

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
