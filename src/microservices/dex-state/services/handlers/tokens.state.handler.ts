import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import {
    EsdtToken,
    EsdtTokenType,
} from 'src/modules/tokens/models/esdtToken.model';
import {
    GetFilteredTokensRequest,
    PaginatedTokens,
    Tokens,
    TokenSortField,
    UpdateTokensRequest,
    UpdateTokensResponse,
} from '../../interfaces/dex_state.interfaces';
import { sortKeysByField } from '../../utils/sort.utils';
import { StateStore } from '../state.store';

const TOKEN_SORT_FIELD_MAP = {
    [TokenSortField.TOKENS_SORT_PRICE]: 'price',
    [TokenSortField.TOKENS_SORT_VOLUME]: 'volumeUSD24h',
    [TokenSortField.TOKENS_SORT_PREV_24H_PRICE]: 'previous24hPrice',
    [TokenSortField.TOKENS_SORT_PREV_7D_PRICE]: 'previous7dPrice',
    [TokenSortField.TOKENS_SORT_PREV_24H_VOLUME]: 'previous24hVolume',
    [TokenSortField.TOKENS_SORT_PRICE_CHANGE_7D]: 'priceChange7d',
    [TokenSortField.TOKENS_SORT_PRICE_CHANGE_24H]: 'priceChange24h',
    [TokenSortField.TOKENS_SORT_VOLUME_CHANGE_24H]: 'volumeUSDChange24h',
    [TokenSortField.TOKENS_SORT_TRADES_CHANGE_24H]: 'tradeChange24h',
    [TokenSortField.TOKENS_SORT_LIQUIDITY]: 'liquidityUSD',
    [TokenSortField.TOKENS_SORT_TRADES_COUNT]: 'swapCount24h',
    [TokenSortField.TOKENS_SORT_TRENDING_SCORE]: 'trendingScore',
    [TokenSortField.TOKENS_SORT_CREATED_AT]: 'createdAt',
};

@Injectable()
export class TokensStateHandler {
    constructor(private readonly stateStore: StateStore) {}

    getTokens(tokenIDs: string[], fields: string[] = []): Tokens {
        const result: Tokens = {
            tokens: [],
        };

        if (!tokenIDs) {
            return result;
        }

        for (const tokenID of tokenIDs) {
            if (tokenID === undefined) {
                result.tokens.push(undefined);
                continue;
            }

            const stateToken = this.stateStore.tokens.get(tokenID);

            if (!stateToken) {
                throw new Error(`Token ${tokenID} not found`);
            }

            if (fields.length === 0) {
                result.tokens.push({ ...stateToken });
                continue;
            }

            const token: Partial<EsdtToken> = {};
            for (const field of fields) {
                token[field] = stateToken[field];
            }

            result.tokens.push(token as EsdtToken);
        }

        return result;
    }

    getAllTokens(fields: string[] = []): Tokens {
        return this.getTokens(
            Array.from(this.stateStore.tokens.keys()),
            fields,
        );
    }

    getFilteredTokens(request: GetFilteredTokensRequest): PaginatedTokens {
        const fields = request.fields?.paths ?? [];
        const {
            enabledSwaps,
            identifiers,
            minLiquidity,
            searchToken,
            sortField,
            sortOrder,
            offset,
            limit,
        } = request;

        const tokensByType = this.stateStore.tokensByType.get(
            EsdtTokenType.FungibleToken,
        );

        if (!tokensByType) {
            return { count: 0, tokens: [] };
        }

        const tokenIDs = tokensByType.filter((token) => {
            if (enabledSwaps && !this.stateStore.activePairsTokens.has(token)) {
                return false;
            }

            if (identifiers && !identifiers.includes(token)) {
                return false;
            }

            let currentToken: EsdtToken;
            if (searchToken || minLiquidity) {
                currentToken = this.stateStore.tokens.get(token);
            }

            if (searchToken && searchToken.trim().length > 0) {
                const { identifier, name, ticker } = currentToken;
                const searchTerm = searchToken.toUpperCase().trim();

                if (
                    !identifier.toUpperCase().includes(searchTerm) &&
                    !name.toUpperCase().includes(searchTerm) &&
                    !ticker.toUpperCase().includes(searchTerm)
                ) {
                    return false;
                }
            }

            if (minLiquidity) {
                return new BigNumber(currentToken.liquidityUSD).gte(
                    minLiquidity,
                );
            }

            return true;
        });

        if (sortField === TokenSortField.TOKENS_SORT_UNSPECIFIED) {
            const { tokens } = this.getTokens(
                tokenIDs.slice(offset, offset + limit),
                fields,
            );

            return {
                count: tokenIDs.length,
                tokens,
            };
        }

        const decodedSortField = TOKEN_SORT_FIELD_MAP[sortField];

        const sortedTokenIDs = sortKeysByField(
            tokenIDs,
            this.stateStore.tokens,
            decodedSortField,
            sortOrder,
        );

        const { tokens } = this.getTokens(
            sortedTokenIDs.slice(offset, offset + limit),
            fields,
        );

        return {
            count: tokenIDs.length,
            tokens,
        };
    }

    updateTokens(request: UpdateTokensRequest): UpdateTokensResponse {
        const { tokens: partialTokens, updateMask } = request;

        const updatedTokens = new Map<string, EsdtToken>();
        const failedIdentifiers: string[] = [];

        const nonUpdateableFields = ['identifier', 'decimals', 'type'];

        for (const partial of partialTokens) {
            if (!partial.identifier) {
                continue;
            }

            const token = this.stateStore.tokens.get(partial.identifier);

            if (!token) {
                failedIdentifiers.push(partial.identifier);
                continue;
            }

            const updatedToken = { ...token };

            for (const field of updateMask.paths) {
                if (partial[field] === undefined) {
                    continue;
                }

                if (nonUpdateableFields.includes(field)) {
                    continue;
                }

                updatedToken[field] = partial[field];
            }

            updatedTokens.set(partial.identifier, updatedToken);
        }

        if (updatedTokens.size > 0) {
            updatedTokens.forEach((token, identifier) => {
                this.stateStore.setToken(identifier, token);
            });
        }

        return {
            failedIdentifiers,
            updatedCount: updatedTokens.size,
        };
    }
}
