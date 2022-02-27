import { createUnionType } from '@nestjs/graphql';
import { StakingTokenType } from '../staking/models/stakingTokenAttributes.model';

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
        if (
            value.decodedAttributes.type === StakingTokenType.STAKING_FARM_TOKEN
        ) {
            return UserStakeFarmToken.name;
        }
        if (
            value.decodedAttributes.type === StakingTokenType.UNBOND_FARM_TOKEN
        ) {
            return UserUnbondFarmToken.name;
        }
        if (value.decodedAttributes.stakingFarmTokenNonce) {
            return UserDualYiledToken.name;
        }
        return UserNftToken.name;
    },
});
