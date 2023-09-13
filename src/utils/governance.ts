import { governanceConfig } from '../config';
import { GovernanceProposalStatus, VoteType } from '../modules/governance/models/governance.proposal.model';
import { registerEnumType } from '@nestjs/graphql';
import { GOVERNANCE_EVENTS } from '@multiversx/sdk-exchange';

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

export enum GovernanceSmoothingFunction {
    CVADRATIC = 'cvadratic',
    LINEAR = 'linear',
}

registerEnumType(GovernanceSmoothingFunction, { name: 'GovernanceSmoothingFunction' });

const toSmoothingFunctionEnum = (type: string): GovernanceSmoothingFunction => {
    switch (type) {
        case GovernanceSmoothingFunction.CVADRATIC.toString():
            return GovernanceSmoothingFunction.CVADRATIC;
        case GovernanceSmoothingFunction.LINEAR.toString():
            return GovernanceSmoothingFunction.LINEAR;
        default:
            return undefined;
    }
};

export const governanceType = (governanceAddress: string): GovernanceType | undefined => {
    const types = Object.keys(governanceConfig);
    for (const type of types) {
        const smoothingFunctions = Object.keys(governanceConfig[type]);
        for (const smoothingFunction of smoothingFunctions) {
            const address = governanceConfig[type][smoothingFunction].find(
                (address: string) => address === governanceAddress,
            );
            if (address !== undefined) {
                return toTypeEnum(type);
            }
        }
    }
    return undefined;
};

export const governanceSmoothingFunction = (governanceAddress: string): GovernanceSmoothingFunction | undefined => {
    const types = Object.keys(governanceConfig);
    for (const type of types) {
        const smoothingFunctions = Object.keys(governanceConfig[type]);
        for (const smoothingFunction of smoothingFunctions) {
            const address = governanceConfig[type][smoothingFunction].find(
                (address: string) => address === governanceAddress,
            );
            if (address !== undefined) {
                return toSmoothingFunctionEnum(smoothingFunction);
            }
        }
    }
    return undefined;
};

export const governanceContractsAddresses = (types?: string[]): string[] => {
    const addresses = [];
    if (types === undefined || types.length === 0) {
        types = Object.keys(governanceConfig)
    }
    for (const type of types) {
        const smoothingFunctions = Object.keys(governanceConfig[type]);
        for (const smoothingFunction of smoothingFunctions) {
            addresses.push(...governanceConfig[type][smoothingFunction]);
        }
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

export const toVoteType = (event: GOVERNANCE_EVENTS | string): VoteType => {
    switch(event) {
        case GOVERNANCE_EVENTS.UP:
            return VoteType.UpVote;
        case GOVERNANCE_EVENTS.DOWN:
            return VoteType.DownVote;
        case GOVERNANCE_EVENTS.DOWN_VETO:
            return VoteType.DownVetoVote;
        case GOVERNANCE_EVENTS.ABSTAIN:
            return VoteType.AbstainVote;
        default:
            return VoteType.NotVoted;
    }
}
