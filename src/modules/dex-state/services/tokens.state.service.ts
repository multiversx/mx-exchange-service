import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { DEX_STATE_CLIENT } from 'src/microservices/dex-state/dex.state.client.module';
import {
    DEX_STATE_SERVICE_NAME,
    IDexStateServiceClient,
    SortOrder,
    TokenSortField,
} from 'src/microservices/dex-state/interfaces/dex_state.interfaces';
import { TokenType } from 'src/microservices/dex-state/interfaces/tokens.interfaces';
import { SortingOrder } from 'src/modules/common/page.data';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import {
    TokensFilter,
    TokenSortingArgs,
    TokensSortableFields,
} from 'src/modules/tokens/models/tokens.filter.args';

const sortOrderMap = {
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
export class TokensStateService implements OnModuleInit {
    private dexStateServive: IDexStateServiceClient;

    constructor(@Inject(DEX_STATE_CLIENT) private client: ClientGrpc) {}

    onModuleInit() {
        this.dexStateServive = this.client.getService<IDexStateServiceClient>(
            DEX_STATE_SERVICE_NAME,
        );
    }

    async getTokens(
        tokenIDs: string[],
        fields: string[] = [],
    ): Promise<EsdtToken[]> {
        const profiler = new PerformanceProfiler();
        const result = await firstValueFrom(
            this.dexStateServive.getTokens({
                identifiers: tokenIDs,
                fields: { paths: fields },
            }),
        );

        profiler.stop();

        console.log('GET TOKENS', profiler.duration);

        return result.tokens.map(
            (token) =>
                new EsdtToken({
                    ...token,
                    type: token.type as unknown as string,
                }),
        );
    }
    /*
    private convertToEsdtToken(token: Token, fields: string[] = []): EsdtToken {
        const {
            type,
            swapCount24h,
            previous24hSwapCount,
            transactions,
            createdAt,
        } = token;
        const convertedFields: Partial<EsdtToken> = {};

        let addType = false;
        let addSwapCount = false;

        if (fields.length === 0) {
            addType = true;
            addSwapCount = true;
        } else {
            addType = fields.includes('type');
        }
        fields.length === 0 || fields.includes('swapCount24h');
        // const addType = fields.length === 0 || fields.includes('type');
        // const addType = fields.length === 0 || fields.includes('type');
        // const addType = fields.length === 0 || fields.includes('type');

        if (fields.length === 0 || fields.includes('type')) {
            convertedFields.type = type as unknown as string;
        }

        if (fields.length === 0 || fields.includes('swapCount24h')) {
            convertedFields.swapCount24h = swapCount24h.toNumber();
        }

        const esdtToken = new EsdtToken({
            ...token,
            ...(addType && { type: '1' }),
            ...(addSwapCount && {
                swapCount24h: (
                    token.swapCount24h as unknown as Long
                ).toNumber(),
            }),
        });

        //  type: token.type as unknown as string,
        //                 swapCount24h: token.swapCount24h.toNumber(),
        //                 previous24hSwapCount:
        //                     token.previous24hSwapCount.valueOf(),
        //                 transactions: token.transactions.valueOf(),
        //                 // accounts: (token.accounts as unknown as Long).valueOf(),
        //                 createdAt: token.createdAt ?? '0',
    }
*/
    async getAllTokens(fields: string[] = []): Promise<EsdtToken[]> {
        const profiler = new PerformanceProfiler();
        const result = await firstValueFrom(
            this.dexStateServive.getAllTokens({
                fields: { paths: fields },
            }),
        );

        profiler.stop();

        console.log('GET ALL TOKENS', profiler.duration);

        return result.tokens.map(
            (token) =>
                new EsdtToken({
                    ...token,
                    type: token.type as unknown as string,
                }),
        );
    }

    async getFilteredTokens(
        offset: number,
        limit: number,
        filters: TokensFilter,
        sortArgs?: TokenSortingArgs,
        fields: string[] = [],
    ): Promise<{ tokens: EsdtToken[]; count: number }> {
        const profiler = new PerformanceProfiler();
        const sortOrder = sortArgs
            ? sortArgs.sortOrder === SortingOrder.ASC
                ? SortOrder.SORT_ASC
                : SortOrder.SORT_DESC
            : SortOrder.SORT_ORDER_UNSPECIFIED;

        const sortField =
            sortArgs && sortArgs.sortField
                ? sortOrderMap[sortArgs.sortField]
                : TokenSortField.TOKENS_SORT_UNSPECIFIED;

        const result = await firstValueFrom(
            this.dexStateServive.getFilteredTokens({
                enabledSwaps: filters.enabledSwaps,
                identifiers: filters.identifiers,
                minLiquidity: filters.minLiquidity,
                searchToken: filters.searchToken,
                limit,
                offset,
                sortOrder,
                sortField,
                type: TokenType.TOKEN_TYPE_FUNGIBLE_TOKEN,
                fields: { paths: fields },
            }),
        );

        profiler.stop();

        console.log('GET FILTERED TOKENS', profiler.duration);

        return {
            tokens:
                result.tokens?.map(
                    (token) =>
                        new EsdtToken({
                            ...token,
                            type: token.type.toString(),
                        }),
                ) ?? [],
            count: result.count,
        };
    }
}
