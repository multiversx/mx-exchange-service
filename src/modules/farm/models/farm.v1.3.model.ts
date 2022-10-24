import { Field, ObjectType } from '@nestjs/graphql';
import {
    BaseFarmModel,
    FarmMigrationConfig,
    FarmRewardType,
} from './farm.model';

@ObjectType()
export class FarmModelV1_3 extends BaseFarmModel {
    @Field()
    apr: string;

    @Field()
    rewardType: FarmRewardType;

    @Field(() => FarmMigrationConfig, { nullable: true })
    migrationConfig: FarmMigrationConfig;

    constructor(init?: Partial<FarmModelV1_3>) {
        super(init);
        Object.assign(this, init);
    }
}
