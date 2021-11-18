import { createUnionType } from '@nestjs/graphql';

import {
    UserFarmToken,
    UserLockedFarmToken,
    UserLockedLPToken,
    UserLockedAssetToken,
    UserNftToken,
} from './models/user.model';

export const UserNftTokens = createUnionType({
    name: 'UserNftTokens',
    types: () => [
        UserLockedAssetToken,
        UserFarmToken,
        UserLockedLPToken,
        UserLockedFarmToken,
        UserNftToken,
    ],
    resolveType(value) {
        if (value.decodedAttributes.aprMultiplier) {
            return UserFarmToken.name;
        }
        if (value.decodedAttributes.lpTokenID) {
            return UserLockedLPToken.name;
        }
        if (value.decodedAttributes.farmTokenID) {
            return UserLockedFarmToken.name;
        }
        if (value.decodedAttributes.unlockSchedule) {
            return UserLockedAssetToken.name;
        }
        return UserNftToken.name;
    },
});
