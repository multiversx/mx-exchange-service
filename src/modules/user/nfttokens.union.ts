import { createUnionType } from '@nestjs/graphql';

import {
    UserFarmToken,
    UserLockedFarmToken,
    UserLockedLPToken,
    UserLockedAssetToken,
    UserNftToken,
    UserStakeFarmToken,
    UserDualYiledToken,
    UserUnbondFarmToken,
} from './models/user.model';

export const UserNftTokens = createUnionType({
    name: 'UserNftTokens',
    types: () => [
        UserLockedAssetToken,
        UserFarmToken,
        UserLockedLPToken,
        UserLockedFarmToken,
        UserStakeFarmToken,
        UserUnbondFarmToken,
        UserDualYiledToken,
        UserNftToken,
    ],
    resolveType(value) {
        if (value.decodedAttributes.originalEnteringEpoch) {
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
        if (value.decodedAttributes.lastClaimBlock) {
            return UserStakeFarmToken.name;
        }
        if (value.decodedAttributes.remainingEpochs) {
            return UserUnbondFarmToken.name;
        }
        if (value.decodedAttributes.stakingFarmTokenNonce) {
            return UserDualYiledToken.name;
        }
        return UserNftToken.name;
    },
});
