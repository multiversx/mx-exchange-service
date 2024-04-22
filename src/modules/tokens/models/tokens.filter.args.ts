import { ArgsType, Field, registerEnumType } from '@nestjs/graphql';
import { PaginationArgs } from 'src/modules/dex.model';

export enum TokensSortableFields {
    PRICE = 'price',
    PREVIOUS_24H_PRICE = 'previous_24h_price',
    PREVIOUS_7D_PRICE = 'previous_7d_price',
    PREVIOUS_24_VOLUME = 'previous_24h_volume',
    LIQUIDITY = 'liquidity',
}

export enum TokensSortOrder {
    ASC = 'ascending',
    DESC = 'descending',
}

registerEnumType(TokensSortableFields, { name: 'TokensSortableFields' });
registerEnumType(TokensSortOrder, { name: 'TokensSortOrder' });

@ArgsType()
export class TokensFiltersArgs {
    @Field(() => [String], { nullable: true })
    identifiers: string;
    @Field({ nullable: true })
    type: string;
    @Field({ defaultValue: false })
    enabledSwaps: boolean;
}

@ArgsType()
export class TokensPaginationArgs extends PaginationArgs {
    @Field(() => TokensSortableFields, { nullable: true })
    sortField?: string;

    @Field(() => TokensSortOrder, { defaultValue: TokensSortOrder.ASC })
    sortOrder: string;
}
