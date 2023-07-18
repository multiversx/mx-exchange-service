import { createUnionType } from '@nestjs/graphql';
import { GovernanceEnergyContract } from './energy.contract.model';

export const GovernanceUnion = createUnionType({
    name: 'GovernanceTypes',
    types: () =>
        [
            GovernanceEnergyContract,
        ] as const,
    resolveType(governance) {
        switch (governance.constructor.name) {
            case GovernanceEnergyContract.name:
                return GovernanceEnergyContract;
        }
    },
});
