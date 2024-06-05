import { ArgsType, Field, InputType, registerEnumType } from '@nestjs/graphql';
import { SortingOrder } from 'src/modules/common/page.data';

export enum TokensSortableFields {
    PRICE = 'price',
    VOLUME = 'volume',
    PREVIOUS_24H_PRICE = 'previous_24h_price',
    PREVIOUS_7D_PRICE = 'previous_7d_price',
    PREVIOUS_24H_VOLUME = 'previous_24h_volume',
    LIQUIDITY = 'liquidity',
    TRADES_COUNT = 'trades_count',
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
}

@InputType()
export class TokenSortingArgs {
    @Field(() => TokensSortableFields, { nullable: true })
    sortField?: TokensSortableFields;

    @Field(() => SortingOrder, { defaultValue: SortingOrder.ASC })
    sortOrder: SortingOrder;
}
