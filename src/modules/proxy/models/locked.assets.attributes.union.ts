import { createUnionType } from '@nestjs/graphql';
import { LockedAssetAttributesModel } from 'src/modules/locked-asset-factory/models/locked-asset.model';
import { LockedTokenAttributesModel } from 'src/modules/simple-lock/models/simple.lock.model';

export const LockedAssetAttributesUnion = createUnionType({
    name: 'LockedAssetAttributesUnion',
    types: () =>
        [LockedAssetAttributesModel, LockedTokenAttributesModel] as const,
    resolveType(attributes) {
        switch (attributes.constructor.name) {
            case LockedAssetAttributesModel.name:
                return LockedAssetAttributesModel.name;
            case LockedTokenAttributesModel.name:
                return LockedTokenAttributesModel.name;
        }
    },
});
