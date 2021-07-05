import { createUnionType } from '@nestjs/graphql';

import {
    UserFarmToken,
    UserLockedFarmToken,
    UserLockedLPToken,
    UserNftToken,
} from 'src/models/user.model';

export const UserNftTokens = createUnionType({
    name: 'UserNftTokens',
    types: () => [
        UserNftToken,
        UserFarmToken,
        UserLockedLPToken,
        UserLockedFarmToken,
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
        return UserNftToken.name;
    },
});
