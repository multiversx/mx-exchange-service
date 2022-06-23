import { createUnionType } from '@nestjs/graphql';
import { StakingFarmTokenType } from '@elrondnetwork/erdjs-dex';

import {
    UserFarmToken,
    UserLockedFarmToken,
    UserLockedLPToken,
    UserLockedAssetToken,
    UserNftToken,
    UserStakeFarmToken,
    UserDualYiledToken,
    UserUnbondFarmToken,
    UserRedeemToken,
    UserLockedEsdtToken,
    UserLockedSimpleLpToken,
    UserLockedSimpleFarmToken,
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
        UserRedeemToken,
        UserLockedEsdtToken,
        UserLockedSimpleLpToken,
        UserLockedSimpleFarmToken,
        UserNftToken,
    ],
    resolveType(value) {
        switch (value.constructor.name) {
            case UserRedeemToken.name:
                return UserRedeemToken.name;
            case UserLockedEsdtToken.name:
                return UserLockedEsdtToken.name;
            case UserLockedSimpleLpToken.name:
                return UserLockedSimpleLpToken.name;
            case UserLockedSimpleFarmToken.name:
                return UserLockedSimpleFarmToken.name;
            default:
                break;
        }
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
            value.decodedAttributes.type ===
            StakingFarmTokenType.STAKING_FARM_TOKEN
        ) {
            return UserStakeFarmToken.name;
        }
        if (
            value.decodedAttributes.type ===
            StakingFarmTokenType.UNBOND_FARM_TOKEN
        ) {
            return UserUnbondFarmToken.name;
        }
        if (value.decodedAttributes.stakingFarmTokenNonce) {
            return UserDualYiledToken.name;
        }

        return UserNftToken.name;
    },
});
