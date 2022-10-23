import { createUnionType } from '@nestjs/graphql';
import { FarmCustomModel } from './farm.custom.model';
import { BaseFarmModel } from './farm.model';
import { FarmModelV1_2 } from './farm.v1.2.model';
import { FarmModelV1_3 } from './farm.v1.3.model';
import { FarmModelV2 } from './farm.v2.model';

export const FarmsUnion = createUnionType({
    name: 'FarmVersions',
    types: () =>
        [
            FarmModelV1_2,
            FarmModelV1_3,
            FarmCustomModel,
            FarmModelV2,
            BaseFarmModel,
        ] as const,
    resolveType(farm) {
        switch (farm.constructor.name) {
            case FarmModelV1_2.name:
                return FarmModelV1_2.name;
            case FarmModelV1_3.name:
                return FarmModelV1_3.name;
            case FarmCustomModel.name:
                return FarmCustomModel.name;
            case FarmModelV2.name:
                return FarmModelV2.name;
        }
    },
});
