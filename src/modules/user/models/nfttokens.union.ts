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
    UserLockedTokenEnergy,
    UserLockedLPTokenV2,
    UserLockedFarmTokenV2,
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
        UserNftToken,
    ],
    resolveType(value) {
        switch (value.constructor.name) {
            case UserLockedLPToken.name:
                return UserLockedLPToken.name;
            case UserLockedFarmToken.name:
                return UserLockedFarmToken.name;
            case UserLockedLPTokenV2.name:
                return UserLockedLPTokenV2.name;
            case UserLockedFarmTokenV2.name:
                return UserLockedFarmTokenV2.name;
            case UserRedeemToken.name:
                return UserRedeemToken.name;
            case UserLockedEsdtToken.name:
                return UserLockedEsdtToken.name;
            case UserLockedSimpleLpToken.name:
                return UserLockedSimpleLpToken.name;
            case UserLockedSimpleFarmToken.name:
                return UserLockedSimpleFarmToken.name;
            case UserLockedTokenEnergy.name:
                return UserLockedTokenEnergy.name;
            default:
                break;
        }
        if (value.decodedAttributes.originalEnteringEpoch) {
            return UserFarmToken.name;
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
