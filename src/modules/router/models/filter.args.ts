import { ArgsType, Field, InputType, registerEnumType } from '@nestjs/graphql';
import { Expose, Transform, Type } from 'class-transformer';
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
    @Expose()
    @Field(() => [String], { nullable: true })
    addresses: string[];
    @Expose()
    @Field({ nullable: true })
    firstTokenID: string;
    @Expose()
    @Field({ nullable: true })
    secondTokenID: string;
    @Expose()
    @Field(() => Boolean)
    issuedLpToken = true;
    @Expose()
    @Field({ nullable: true })
    state: string;
    @Expose()
    @Field({ nullable: true })
    minVolume: number;
    @Expose()
    @Field({ nullable: true })
    feeState: boolean;
    @Expose()
    @Field({ nullable: true })
    minLockedValueUSD: number;
}

@InputType()
export class PairsFilter {
    @Expose()
    @Field(() => [String], { nullable: true })
    addresses: string[];
    @Expose()
    @Field({ nullable: true })
    firstTokenID: string;
    @Expose()
    @Field({ nullable: true })
    secondTokenID: string;
    @Expose()
    @Field(() => Boolean)
    issuedLpToken = true;
    @Expose()
    @Field(() => [String], { nullable: true })
    state: string[];
    @Expose()
    @Field({ nullable: true })
    minVolume: number;
    @Expose()
    @Field({ nullable: true })
    feeState: boolean;
    @Expose()
    @Field({ nullable: true })
    minLockedValueUSD: number;
    @Expose()
    @Field({ nullable: true })
    minTradesCount: number;
    @Expose()
    @Field({ nullable: true })
    minTradesCount24h: number;
    @Expose()
    @Field({ nullable: true })
    hasFarms: boolean;
    @Expose()
    @Field({ nullable: true })
    hasDualFarms: boolean;
    @Expose()
    @Field({ nullable: true })
    minDeployedAt: number;
    @Expose()
    @Field({ nullable: true })
    searchToken: string;
    @Expose()
    @Field(() => [String], { nullable: true })
    lpTokenIds: string[];
    @Expose()
    @Field(() => [String], { nullable: true })
    farmTokens: string[];
}

export function pairSortableFieldToString(value: PairSortableFields): string {
    return PairSortableFields[value];
}

export function sortingOrderToString(value: SortingOrder): string {
    return SortingOrder[value];
}

@InputType()
export class PairSortingArgs {
    @Expose()
    @Transform(({ value }) => pairSortableFieldToString(value))
    @Field(() => PairSortableFields, { nullable: true })
    sortField?: string;

    @Expose()
    @Transform(({ value }) => sortingOrderToString(value))
    @Field(() => SortingOrder, { defaultValue: SortingOrder.ASC })
    sortOrder = SortingOrder.ASC;
}
