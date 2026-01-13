import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { StateRpcMetrics } from 'src/helpers/decorators/state.rpc.metrics.decorator';
import {
    SortOrder,
    TokenSortField,
    UpdateTokensResponse,
} from 'src/microservices/dex-state/interfaces/dex_state.interfaces';
import { SortingOrder } from 'src/modules/common/page.data';
import {
    EsdtToken,
    EsdtTokenType,
} from 'src/modules/tokens/models/esdtToken.model';
import {
    TokensFilter,
    TokenSortingArgs,
    TokensSortableFields,
} from 'src/modules/tokens/models/tokens.filter.args';
import { formatToken } from '../state.format.utils';
import { StateGrpcClientService } from './state.grpc.client.service';

const sortFieldMap = {
    [TokensSortableFields.PRICE]: TokenSortField.TOKENS_SORT_PRICE,
    [TokensSortableFields.VOLUME]: TokenSortField.TOKENS_SORT_VOLUME,
    [TokensSortableFields.PREVIOUS_24H_PRICE]:
        TokenSortField.TOKENS_SORT_PREV_24H_PRICE,
    [TokensSortableFields.PREVIOUS_7D_PRICE]:
        TokenSortField.TOKENS_SORT_PREV_7D_PRICE,
    [TokensSortableFields.PREVIOUS_24H_VOLUME]:
        TokenSortField.TOKENS_SORT_PREV_24H_VOLUME,
    [TokensSortableFields.PRICE_CHANGE_7D]:
        TokenSortField.TOKENS_SORT_PRICE_CHANGE_7D,
    [TokensSortableFields.PRICE_CHANGE_24H]:
        TokenSortField.TOKENS_SORT_PRICE_CHANGE_24H,
    [TokensSortableFields.VOLUME_CHANGE_24H]:
        TokenSortField.TOKENS_SORT_VOLUME_CHANGE_24H,
    [TokensSortableFields.TRADES_COUNT_CHANGE_24H]:
        TokenSortField.TOKENS_SORT_TRADES_CHANGE_24H,
    [TokensSortableFields.LIQUIDITY]: TokenSortField.TOKENS_SORT_LIQUIDITY,
    [TokensSortableFields.TRADES_COUNT]:
        TokenSortField.TOKENS_SORT_TRADES_COUNT,
    [TokensSortableFields.TRENDING_SCORE]:
        TokenSortField.TOKENS_SORT_TRENDING_SCORE,
    [TokensSortableFields.CREATED_AT]: TokenSortField.TOKENS_SORT_CREATED_AT,
};

@Injectable()
export class TokensStateService {
    constructor(private readonly stateGrpc: StateGrpcClientService) {}

    @StateRpcMetrics()
    async getTokens(
        tokenIDs: string[],
        fields: (keyof EsdtToken)[] = [],
    ): Promise<EsdtToken[]> {
        const result = await firstValueFrom(
            this.stateGrpc.client.getTokens({
                identifiers: tokenIDs,
                fields: { paths: fields },
            }),
        );

        if (!result.tokens) {
            return [];
        }

        return result.tokens.map((token) => formatToken(token, fields));
    }

    @StateRpcMetrics()
    async getAllTokens(fields: (keyof EsdtToken)[] = []): Promise<EsdtToken[]> {
        const result = await firstValueFrom(
            this.stateGrpc.client.getAllTokens({
                fields: { paths: fields },
            }),
        );

        return result.tokens.map((token) => formatToken(token, fields));
    }

    @StateRpcMetrics()
    async getFilteredTokens(
        offset: number,
        limit: number,
        filters: TokensFilter,
        sortArgs?: TokenSortingArgs,
        fields: (keyof EsdtToken)[] = [],
    ): Promise<{ tokens: EsdtToken[]; count: number }> {
        const sortOrder = sortArgs
            ? sortArgs.sortOrder === SortingOrder.ASC
                ? SortOrder.SORT_ASC
                : SortOrder.SORT_DESC
            : SortOrder.SORT_ORDER_UNSPECIFIED;

        const sortField =
            sortArgs && sortArgs.sortField
                ? sortFieldMap[sortArgs.sortField]
                : TokenSortField.TOKENS_SORT_UNSPECIFIED;

        const result = await firstValueFrom(
            this.stateGrpc.client.getFilteredTokens({
                enabledSwaps: filters.enabledSwaps,
                identifiers: filters.identifiers,
                minLiquidity: filters.minLiquidity,
                searchToken: filters.searchToken,
                limit,
                offset,
                sortOrder,
                sortField,
                type: EsdtTokenType.FungibleToken,
                fields: { paths: fields },
            }),
        );

        return {
            tokens:
                result.tokens?.map((token) => formatToken(token, fields)) ?? [],
            count: result.count,
        };
    }

    @StateRpcMetrics()
    async updateTokens(
        tokenUpdates: Map<string, Partial<EsdtToken>>,
    ): Promise<UpdateTokensResponse> {
        if (tokenUpdates.size === 0) {
            return {
                failedIdentifiers: [],
                updatedCount: 0,
            };
        }

        const tokens: EsdtToken[] = [];
        const paths: string[] = [];

        tokenUpdates.forEach((token, identifier) => {
            paths.push(...Object.keys(token));

            tokens.push({
                identifier,
                ...(token as EsdtToken),
            });
        });

        return firstValueFrom(
            this.stateGrpc.client.updateTokens({
                tokens,
                updateMask: { paths: [...new Set(paths)] },
            }),
        );
    }
}
