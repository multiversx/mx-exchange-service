import { Field, ObjectType } from '@nestjs/graphql';
import {
    BaseFarmModel,
    FarmMigrationConfig,
    FarmRewardType,
} from './farm.model';
import { LockedAssetModel } from 'src/modules/locked-asset-factory/models/locked-asset.model';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';

@ObjectType()
export class FarmModelV1_3 extends BaseFarmModel {
    @Field()
    apr: string;

    @Field({ nullable: true, complexity: nestedFieldComplexity })
    lockedAssetFactory: LockedAssetModel;

    @Field()
    rewardType: FarmRewardType;

    @Field(() => FarmMigrationConfig, { nullable: true })
    migrationConfig: FarmMigrationConfig;

    constructor(init?: Partial<FarmModelV1_3>) {
        super(init);
        Object.assign(this, init);
    }
}
