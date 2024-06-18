import { ArgsType, Field, InputType, registerEnumType } from '@nestjs/graphql';
import { SortingOrder } from 'src/modules/common/page.data';

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
    @Field(() => [String], { nullable: true })
    identifiers: string;
    @Field({ nullable: true })
    type: string;
    @Field({ defaultValue: false })
    enabledSwaps: boolean;
}

@InputType()
export class TokensFilter {
    @Field(() => [String], { nullable: true })
    identifiers?: string[];
    @Field(() => String, { nullable: true })
    type?: string;
    @Field(() => Boolean, { defaultValue: false })
    enabledSwaps: boolean;
    @Field({ nullable: true })
    searchToken?: string;
    @Field({ nullable: true })
    minLiquidity: number;
}

@InputType()
export class TokenSortingArgs {
    @Field(() => TokensSortableFields, { nullable: true })
    sortField?: TokensSortableFields;

    @Field(() => SortingOrder, { defaultValue: SortingOrder.ASC })
    sortOrder: SortingOrder;
}
