import { ArgsType, Field, InputType, registerEnumType } from '@nestjs/graphql';
import { SortingOrder } from 'src/modules/common/page.data';

export enum PairSortableFields {
    TRADES_COUNT = 'trades_count',
    TRADES_COUNT_24 = 'trades_count_24h',
    TVL = 'total_value_locked',
    VOLUME_24 = 'volume_24h',
    FEES_24 = 'fees_24h',
    DEPLOYED_AT = 'deployed_at',
    APR = 'apr',
}

registerEnumType(PairSortableFields, { name: 'PairSortableFields' });

@ArgsType()
export class PairFilterArgs {
    @Field(() => [String], { nullable: true })
    addresses: string[];
    @Field({ nullable: true })
    firstTokenID: string;
    @Field({ nullable: true })
    secondTokenID: string;
    @Field(() => Boolean)
    issuedLpToken = true;
    @Field({ nullable: true })
    state: string;
    @Field({ nullable: true })
    minVolume: number;
    @Field({ nullable: true })
    feeState: boolean;
    @Field({ nullable: true })
    minLockedValueUSD: number;
}

@InputType()
export class PairsFilter {
    @Field(() => [String], { nullable: true })
    addresses: string[];
    @Field({ nullable: true })
    firstTokenID: string;
    @Field({ nullable: true })
    secondTokenID: string;
    @Field(() => Boolean)
    issuedLpToken = true;
    @Field(() => [String], { nullable: true })
    state: string[];
    @Field({ nullable: true })
    minVolume: number;
    @Field({ nullable: true })
    feeState: boolean;
    @Field({ nullable: true })
    minLockedValueUSD: number;
    @Field({ nullable: true })
    minTradesCount: number;
    @Field({ nullable: true })
    minTradesCount24h: number;
    @Field({ nullable: true })
    hasFarms: boolean;
    @Field({ nullable: true })
    hasDualFarms: boolean;
    @Field({ nullable: true })
    minDeployedAt: number;
    @Field({ nullable: true })
    searchToken: string;
    @Field(() => [String], { nullable: true })
    lpTokenIds: string[];
    @Field(() => [String], { nullable: true })
    farmTokens: string[];
}

@InputType()
export class PairSortingArgs {
    @Field(() => PairSortableFields, { nullable: true })
    sortField?: string;

    @Field(() => SortingOrder, { defaultValue: SortingOrder.ASC })
    sortOrder: string;
}
