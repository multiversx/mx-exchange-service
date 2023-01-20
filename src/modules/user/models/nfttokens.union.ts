import { createUnionType } from '@nestjs/graphql';
import { StakingFarmTokenType } from '@multiversx/sdk-exchange';

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
    UserLockedTokenEnergy,
    UserLockedLPTokenV2,
    UserLockedFarmTokenV2,
    UserWrappedLockedToken,
} from './user.model';

export const UserNftTokens = createUnionType({
    name: 'UserNftTokens',
    types: () => [
        UserLockedAssetToken,
        UserFarmToken,
        UserLockedLPToken,
        UserLockedFarmToken,
        UserLockedLPTokenV2,
        UserLockedFarmTokenV2,
        UserStakeFarmToken,
        UserUnbondFarmToken,
        UserDualYiledToken,
        UserRedeemToken,
        UserLockedEsdtToken,
        UserLockedSimpleLpToken,
        UserLockedSimpleFarmToken,
        UserLockedTokenEnergy,
        UserWrappedLockedToken,
        UserNftToken,
    ],
    resolveType(value) {
        switch (value.constructor.name) {
            case UserLockedLPToken.name:
            case UserLockedFarmToken.name:
            case UserLockedLPTokenV2.name:
            case UserLockedFarmTokenV2.name:
            case UserRedeemToken.name:
            case UserLockedEsdtToken.name:
            case UserLockedSimpleLpToken.name:
            case UserLockedSimpleFarmToken.name:
            case UserLockedTokenEnergy.name:
            case UserWrappedLockedToken.name:
            case UserFarmToken.name:
                return value.constructor.name;
            default:
                break;
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
