import { ArgsType, Field, InputType, Int } from '@nestjs/graphql';
import { InputTokenModel } from 'src/models/inputToken.model';

@InputType()
export class FarmsFilter {
    @Field(() => [String], { nullable: true })
    versions?: string[];

    @Field(() => [String], { nullable: true })
    addresses?: string[];
}

@InputType()
export class CalculateRewardsArgs {
    @Field()
    farmAddress: string;
    @Field()
    user: string;
    @Field()
    liquidity: string;
    @Field()
    identifier: string;
    @Field()
    attributes: string;
    @Field(() => Boolean)
    vmQuery = false;
}

@InputType()
export class BatchFarmRewardsComputeArgs {
    @Field(() => [CalculateRewardsArgs])
    farmsPositions: Array<{
        farmAddress: string;
        user: string;
        liquidity: string;
        identifier: string;
        attributes: string;
        vmQuery: boolean;
    }>;
}

@ArgsType()
export class EnterFarmArgs {
    @Field()
    farmAddress: string;
    @Field(() => [InputTokenModel])
    tokens: Array<InputTokenModel>;
    @Field({ nullable: true })
    lockRewards: boolean;
}

@ArgsType()
export class SftFarmInteractionArgs {
    @Field()
    farmAddress: string;
    @Field()
    farmTokenID: string;
    @Field(() => Int)
    farmTokenNonce: number;
    @Field()
    amount: string;
    @Field(() => Boolean, { nullable: true })
    lockRewards = false;
}

@ArgsType()
export class ExitFarmArgs extends SftFarmInteractionArgs {
    @Field(() => Boolean, { nullable: true })
    withPenalty = false;
    @Field({
        nullable: true,
        deprecationReason:
            'Exit farm no longer require this value;' +
            'field is deprecated and will be removed on next release;',
    })
    exitAmount?: string;
}

@ArgsType()
export class ClaimRewardsArgs extends SftFarmInteractionArgs {}

@ArgsType()
export class CompoundRewardsArgs extends SftFarmInteractionArgs {}

@ArgsType()
export class FarmMigrationConfigArgs {
    @Field()
    oldFarmAddress: string;
    @Field()
    oldFarmTokenID: string;
    @Field()
    newFarmAddress: string;
    @Field()
    newLockedFarmAddress: string;
}

@ArgsType()
export class MergeFarmTokensArgs {
    @Field()
    farmAddress: string;
    @Field(() => [InputTokenModel])
    payments: Array<InputTokenModel>;
}
