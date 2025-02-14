import { Field, Int, ObjectType } from '@nestjs/graphql';
import { BaseFarmModel, FarmMigrationConfig } from './farm.model';
import { LockedAssetModel } from 'src/modules/locked-asset-factory/models/locked-asset.model';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';

@ObjectType()
export class FarmModelV1_2 extends BaseFarmModel {
    @Field()
    farmingTokenReserve: string;

    @Field()
    undistributedFees: string;

    @Field()
    currentBlockFee: string;

    @Field(() => Int)
    aprMultiplier: number;

    @Field({ complexity: nestedFieldComplexity })
    lockedAssetFactory: LockedAssetModel;

    @Field()
    lockedRewardsAPR: string;

    @Field()
    unlockedRewardsAPR: string;

    @Field()
    lockedFarmingTokenReserveUSD: string;

    @Field()
    unlockedFarmingTokenReserveUSD: string;

    @Field()
    lockedFarmingTokenReserve: string;

    @Field()
    unlockedFarmingTokenReserve: string;

    @Field(() => FarmMigrationConfig, { nullable: true })
    migrationConfig: FarmMigrationConfig;
}
