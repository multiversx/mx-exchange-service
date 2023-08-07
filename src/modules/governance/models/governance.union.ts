import { createUnionType } from '@nestjs/graphql';
import { GovernanceEnergyContract, GovernanceTokenSnapshotContract } from './governance.contract.model';
import { DescriptionV0, DescriptionV1 } from './governance.proposal.model';

export const GovernanceUnion = createUnionType({
    name: 'GovernanceTypes',
    types: () =>
        [
            GovernanceTokenSnapshotContract,
            GovernanceEnergyContract,
        ] as const,
    resolveType(governance) {
        switch (governance.constructor.name) {
            case GovernanceTokenSnapshotContract.name:
                return GovernanceTokenSnapshotContract;
            case GovernanceEnergyContract.name:
                return GovernanceEnergyContract;
        }
    },
});

export const GovernanceDescriptionUnion = createUnionType({
    name: 'GovernanceDescriptionVersions',
    types: () =>
        [
            DescriptionV0,
            DescriptionV1,
        ] as const,
    resolveType(description) {
        switch (description.version) {
            case 0:
                return DescriptionV0;
            case 1:
                return DescriptionV1;
        }
    },
});
