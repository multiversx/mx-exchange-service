import { createUnionType } from '@nestjs/graphql';
import { EnergyContract } from './energy.contract.model';

export const GovernanceUnion = createUnionType({
    name: 'GovernanceTypes',
    types: () =>
        [
            EnergyContract,
        ] as const,
    resolveType(governance) {
        switch (governance.constructor.name) {
            case EnergyContract.name:
                return EnergyContract;
        }
    },
});
