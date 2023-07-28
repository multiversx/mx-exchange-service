import { createUnionType } from '@nestjs/graphql';
import { GovernanceEnergyContract, GovernanceTokenSnapshotContract } from './governance.contract.model';

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
