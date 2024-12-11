import { ArgsType, Field, InputType, registerEnumType } from '@nestjs/graphql';
import { Expose, Transform } from 'class-transformer';
import { SortingOrder } from 'src/modules/common/page.data';
import { sortingOrderToString } from 'src/modules/router/models/filter.args';

export enum TokensSortableFields {
    PRICE = 'price',
    VOLUME = 'volume',
    PREVIOUS_24H_PRICE = 'previous_24h_price',
    PREVIOUS_7D_PRICE = 'previous_7d_price',
    PREVIOUS_24H_VOLUME = 'previous_24h_volume',
    PRICE_CHANGE_7D = 'price_change_7d',
    PRICE_CHANGE_24H = 'price_change_24h',
    VOLUME_CHANGE_24H = 'volume_change_24h',
    TRADES_COUNT_CHANGE_24H = 'trades_count_change_24h',
    LIQUIDITY = 'liquidity',
    TRADES_COUNT = 'trades_count',
    TRENDING_SCORE = 'trending_score',
    CREATED_AT = 'created_at',
}

registerEnumType(TokensSortableFields, { name: 'TokensSortableFields' });

@ArgsType()
export class TokensFiltersArgs {
    @Expose()
    @Field(() => [String], { nullable: true })
    identifiers: string;
    @Expose()
    @Field({ nullable: true })
    type: string;
    @Expose()
    @Field(() => Boolean, { defaultValue: false })
    enabledSwaps = false;
}

@InputType()
export class TokensFilter {
    @Expose()
    @Field(() => [String], { nullable: true })
    identifiers?: string[];
    @Expose()
    @Field(() => String, { nullable: true })
    type?: string;
    @Expose()
    @Field(() => Boolean, { defaultValue: false })
    enabledSwaps = false;
    @Expose()
    @Field({ nullable: true })
    searchToken?: string;
    @Expose()
    @Field({ nullable: true })
    minLiquidity: number;
}

export function tokenSortableFieldToString(
    value: TokensSortableFields,
): string {
    return TokensSortableFields[value];
}

@InputType()
export class TokenSortingArgs {
    @Expose()
    @Transform(({ value }) => tokenSortableFieldToString(value))
    @Field(() => TokensSortableFields, { nullable: true })
    sortField?: TokensSortableFields;

    @Expose()
    @Transform(({ value }) => sortingOrderToString(value))
    @Field(() => SortingOrder, { defaultValue: SortingOrder.ASC })
    sortOrder: SortingOrder;
}
