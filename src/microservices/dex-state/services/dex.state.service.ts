import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Injectable, OnModuleInit } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { promises } from 'fs';
import {
    GetAllPairsRequest,
    GetAllTokensRequest,
    GetFilteredPairsRequest,
    GetFilteredTokensRequest,
    PaginatedPairs,
    PaginatedTokens,
    Pairs,
    PairSortField,
    SortOrder,
    Tokens,
    TokenSortField,
} from '../interfaces/dex_state.interfaces';
import { Pair } from '../interfaces/pairs.interfaces';
import { Token, TokenType } from '../interfaces/tokens.interfaces';

const REVERSE_TOKEN_TYPE_MAP = {
    FungibleESDT: TokenType.TOKEN_TYPE_FUNGIBLE_TOKEN,
    'FungibleESDT-LP': TokenType.TOKEN_TYPE_FUNGIBLE_LP_TOKEN,
};

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

const PAIR_SORT_FIELD_MAP = {
    [PairSortField.PAIRS_SORT_DEPLOYED_AT]: 'deployedAt',
    [PairSortField.PAIRS_SORT_FEES]: 'feesUSD24h',
    [PairSortField.PAIRS_SORT_TRADES_COUNT]: 'tradesCount',
    [PairSortField.PAIRS_SORT_TRADES_COUNT_24H]: 'tradesCount24h',
    [PairSortField.PAIRS_SORT_TVL]: 'lockedValueUSD',
    [PairSortField.PAIRS_SORT_VOLUME]: 'volumeUSD24h',
    // [PairSortField.PAIRS_SORT_APR] : 'compoundedAPR',
};

@Injectable()
export class DexStateService implements OnModuleInit {
    private tokens = new Map<string, Token>();
    private pairs = new Map<string, Pair>();
    private tokenPairs = new Map<string, string[]>();
    private tokensByType = new Map<TokenType, string[]>();
    private activePairs = new Set<string>();
    private activePairsTokens = new Set<string>();

    async onModuleInit() {
        await this.syncData();
    }

    async syncData() {
        const [tokensRaw, pairsRaw] = await Promise.all([
            promises.readFile('src/esdt_tokens.json', {
                encoding: 'utf8',
            }),
            promises.readFile('src/pairs.json', {
                encoding: 'utf8',
            }),
        ]);
        const tokensJson: unknown[] = JSON.parse(tokensRaw);
        const pairsJson: unknown[] = JSON.parse(pairsRaw);

        this.tokens.clear();
        this.pairs.clear();
        this.tokensByType.clear();
        this.tokenPairs.clear();
        this.activePairs.clear();
        this.activePairsTokens.clear();

        this.tokensByType.set(TokenType.TOKEN_TYPE_FUNGIBLE_TOKEN, []);
        this.tokensByType.set(TokenType.TOKEN_TYPE_FUNGIBLE_LP_TOKEN, []);

        for (const token of tokensJson as Token[]) {
            if (token.assets) {
                token.assets.lockedAccounts = token.assets.lockedAccounts
                    ? Object.keys(token.assets.lockedAccounts)
                    : [];
            }
            token.roles = token.roles ? Object.values(token.roles) : [];
            token.type = REVERSE_TOKEN_TYPE_MAP[token.type];

            this.tokens.set(token.identifier, token);

            this.tokensByType.get(token.type).push(token.identifier);
        }

        for (const pair of pairsJson as Pair[]) {
            this.pairs.set(pair.address, pair);

            if (!this.tokenPairs.has(pair.firstTokenId)) {
                this.tokenPairs.set(pair.firstTokenId, []);
            }

            if (!this.tokenPairs.has(pair.secondTokenId)) {
                this.tokenPairs.set(pair.secondTokenId, []);
            }

            this.tokenPairs.get(pair.firstTokenId).push(pair.address);
            this.tokenPairs.get(pair.secondTokenId).push(pair.address);

            if (pair.state === 'Active') {
                this.activePairs.add(pair.address);
                this.activePairsTokens.add(pair.firstTokenId);
                this.activePairsTokens.add(pair.secondTokenId);
            }
        }
    }

    getPairs(addresses: string[], fields: string[] = []): Pairs {
        const profiler = new PerformanceProfiler();
        const result: Pairs = {
            pairs: [],
        };

        for (const address of addresses) {
            const statePair = this.pairs.get(address);

            if (!statePair) {
                throw new Error(`Pair ${address} not found`);
            }

            if (fields.length === 0) {
                result.pairs.push(statePair);
                continue;
            }

            const pair: Partial<Pair> = {};
            for (const field of fields) {
                pair[field] = statePair[field];
            }

            result.pairs.push(pair as Pair);
        }

        profiler.stop();
        console.log('SERVICE GET PAIRS', profiler.duration);

        return result;
    }

    getAllPairs(request: GetAllPairsRequest): Pairs {
        const fields = request.fields?.paths ?? [];

        return this.getPairs(Array.from(this.pairs.keys()), fields);
    }

    getFilteredPairs(request: GetFilteredPairsRequest): PaginatedPairs {
        const profiler = new PerformanceProfiler();

        const fields = request.fields?.paths ?? [];
        const {
            addresses,
            issuedLpToken,
            lpTokenIds,
            firstTokenID,
            secondTokenID,
            searchToken,
            // farmTokens,
            state,
            feeState,
            hasFarms,
            hasDualFarms,
            minVolume,
            minLockedValueUSD,
            minTradesCount,
            minTradesCount24h,
            minDeployedAt,
            offset,
            limit,
            sortField,
            sortOrder,
        } = request;

        let minVolumeBN: BigNumber;
        let minLockedValueBN: BigNumber;

        if (minVolume) {
            minVolumeBN = new BigNumber(minVolume);
        }

        if (minLockedValueUSD) {
            minLockedValueBN = new BigNumber(minLockedValueUSD);
        }

        const pairAddresses: string[] = [];
        this.pairs.forEach((pair) => {
            if (issuedLpToken && !pair.liquidityPoolTokenId) {
                return;
            }

            if (addresses && !addresses.includes(pair.address)) {
                return;
            }

            if (
                lpTokenIds &&
                pair.liquidityPoolTokenId &&
                !lpTokenIds.includes(pair.liquidityPoolTokenId)
            ) {
                return;
            }

            if (
                firstTokenID &&
                secondTokenID &&
                [firstTokenID, secondTokenID].includesNone([
                    pair.firstTokenId,
                    pair.secondTokenId,
                ])
            ) {
                return;
            }

            if (firstTokenID && pair.firstTokenId !== firstTokenID) {
                return;
            }

            if (secondTokenID && pair.secondTokenId !== secondTokenID) {
                return;
            }

            if (state && !state.includes(pair.state)) {
                return;
            }

            if (feeState !== undefined && pair.feeState !== feeState) {
                return;
            }

            if (hasFarms !== undefined && pair.hasFarms !== hasFarms) {
                return;
            }

            if (
                hasDualFarms !== undefined &&
                pair.hasDualFarms !== hasDualFarms
            ) {
                return;
            }

            if (minVolumeBN && minVolumeBN.gt(pair.volumeUSD24h)) {
                return;
            }

            if (minLockedValueBN && minLockedValueBN.gt(pair.lockedValueUSD)) {
                return;
            }

            if (minTradesCount && minTradesCount > pair.tradesCount) {
                return;
            }

            if (minTradesCount24h && minTradesCount24h > pair.tradesCount24h) {
                return;
            }

            if (minDeployedAt && minDeployedAt > pair.deployedAt) {
                return;
            }

            if (searchToken && searchToken.trim().length > 0) {
                const firstToken = this.tokens.get(pair.firstTokenId);
                const secondToken = this.tokens.get(pair.secondTokenId);
                const searchTerm = searchToken.toUpperCase().trim();

                if (
                    !firstToken.name.toUpperCase().includes(searchTerm) &&
                    !firstToken.identifier.toUpperCase().includes(searchTerm) &&
                    !firstToken.ticker.toUpperCase().includes(searchTerm) &&
                    !secondToken.name.toUpperCase().includes(searchTerm) &&
                    !secondToken.identifier
                        .toUpperCase()
                        .includes(searchTerm) &&
                    !secondToken.ticker.toUpperCase().includes(searchTerm)
                ) {
                    return;
                }
            }

            pairAddresses.push(pair.address);
        });

        if (sortField === PairSortField.PAIRS_SORT_UNSPECIFIED) {
            const { pairs } = this.getPairs(
                pairAddresses.slice(offset, offset + limit),
                fields,
            );

            return {
                count: pairAddresses.length,
                pairs,
            };
        }

        const decodedSortField = PAIR_SORT_FIELD_MAP[sortField];

        const sortedAddresses = pairAddresses
            .map((address) => ({
                address,
                sortValue: new BigNumber(
                    this.pairs.get(address)[decodedSortField],
                ),
            }))
            .sort((a, b) => {
                if (sortOrder === SortOrder.SORT_ASC) {
                    return a.sortValue.comparedTo(b.sortValue);
                }

                return b.sortValue.comparedTo(a.sortValue);
            })
            .map((item) => item.address);

        const { pairs } = this.getPairs(
            sortedAddresses.slice(offset, offset + limit),
            fields,
        );

        profiler.stop();

        console.log('SERVER FILTERED PAIRS', profiler.duration);

        return {
            count: sortedAddresses.length,
            pairs,
        };
    }

    getTokens(tokenIDs: string[], fields: string[] = []): Tokens {
        const result: Tokens = {
            tokens: [],
        };

        for (const tokenID of tokenIDs) {
            const stateToken = this.tokens.get(tokenID);

            if (!stateToken) {
                throw new Error(`Token ${tokenID} not found`);
            }

            if (fields.length === 0) {
                result.tokens.push(stateToken);
                continue;
            }

            const token: Partial<Token> = {};
            for (const field of fields) {
                token[field] = stateToken[field];
            }

            result.tokens.push(token as Token);
        }

        return result;
    }

    getAllTokens(request: GetAllTokensRequest): Tokens {
        const fields = request.fields?.paths ?? [];

        return this.getTokens(Array.from(this.tokens.keys()), fields);
    }

    getFilteredTokens(request: GetFilteredTokensRequest): PaginatedTokens {
        const profiler = new PerformanceProfiler();
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

        const tokenIDs = this.tokensByType
            .get(TokenType.TOKEN_TYPE_FUNGIBLE_TOKEN)
            .filter((token) => {
                if (enabledSwaps && !this.activePairsTokens.has(token)) {
                    return false;
                }

                if (identifiers && !identifiers.includes(token)) {
                    return false;
                }

                let currentToken: Token;
                if (searchToken || minLiquidity) {
                    currentToken = this.tokens.get(token);
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

        const sortedTokenIDs = tokenIDs
            .map((tokenID) => ({
                tokenID,
                sortValue: new BigNumber(
                    this.tokens.get(tokenID)[decodedSortField],
                ),
            }))
            .sort((a, b) => {
                if (sortOrder === SortOrder.SORT_ASC) {
                    return a.sortValue.comparedTo(b.sortValue);
                }

                return b.sortValue.comparedTo(a.sortValue);
            })
            .map((item) => item.tokenID);

        const { tokens } = this.getTokens(
            sortedTokenIDs.slice(offset, offset + limit),
            fields,
        );

        profiler.stop();

        console.log('SERVER FILTERED TOKENS', profiler.duration);

        return {
            count: tokenIDs.length,
            tokens,
        };
    }
}
