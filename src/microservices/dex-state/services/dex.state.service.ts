import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Injectable, OnModuleInit } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import {
    AddPairLpTokenRequest,
    AddPairRequest,
    GetAllPairsRequest,
    GetAllTokensRequest,
    GetFilteredPairsRequest,
    GetFilteredTokensRequest,
    GetPairsAndTokensRequest,
    InitStateRequest,
    InitStateResponse,
    PaginatedPairs,
    PaginatedTokens,
    PairAndTokens,
    Pairs,
    PairsAndTokensResponse,
    PairSortField,
    SortOrder,
    Tokens,
    TokenSortField,
    UpdatePairsRequest,
    UpdatePairsResponse,
    UpdateTokensRequest,
    UpdateTokensResponse,
} from '../interfaces/dex_state.interfaces';
import { StateTasks, TaskDto } from 'src/modules/dex-state/entities';
import { BulkUpdatesService } from './bulk.updates.service';
import { queueStateTasks } from 'src/modules/dex-state/dex.state.utils';
import { CacheService } from 'src/services/caching/cache.service';
import {
    EsdtToken,
    EsdtTokenType,
} from 'src/modules/tokens/models/esdtToken.model';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { PairInfoModel } from 'src/modules/pair/models/pair-info.model';

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
    [PairSortField.PAIRS_SORT_APR]: 'compoundedAprValue',
};

@Injectable()
export class DexStateService implements OnModuleInit {
    private readonly bulkUpdatesService: BulkUpdatesService;
    private tokens = new Map<string, EsdtToken>();
    private pairs = new Map<string, PairModel>();
    private tokenPairs = new Map<string, string[]>();
    private tokensByType = new Map<EsdtTokenType, string[]>();
    private activePairs = new Set<string>();
    private activePairsTokens = new Set<string>();

    private commonTokenIDs: string[] = [];
    private usdcPrice: number;

    private initialized = false;

    constructor(private readonly cacheService: CacheService) {
        this.bulkUpdatesService = new BulkUpdatesService();
    }

    async onModuleInit() {
        await queueStateTasks(this.cacheService, [
            new TaskDto({
                name: StateTasks.INIT_STATE,
            }),
        ]);
    }

    isReady(): boolean {
        return this.initialized;
    }

    initState(request: InitStateRequest): InitStateResponse {
        const { tokens, pairs, commonTokenIDs, usdcPrice } = request;

        this.tokens.clear();
        this.pairs.clear();
        this.tokensByType.clear();
        this.tokenPairs.clear();
        this.activePairs.clear();
        this.activePairsTokens.clear();

        this.tokensByType.set(EsdtTokenType.FungibleToken, []);
        this.tokensByType.set(EsdtTokenType.FungibleLpToken, []);

        this.usdcPrice = usdcPrice;
        this.commonTokenIDs = commonTokenIDs;

        // todo : validate token type

        for (const token of tokens) {
            this.tokens.set(token.identifier, { ...token });
            this.tokensByType
                .get(token.type as EsdtTokenType)
                .push(token.identifier);
        }

        for (const pair of pairs.values()) {
            this.pairs.set(pair.address, { ...pair });

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

        this.initialized = true;

        return {
            tokensCount: this.tokens.size,
            pairsCount: this.pairs.size,
        };
    }

    getPairs(addresses: string[], fields: string[] = []): Pairs {
        const profiler = new PerformanceProfiler();
        const result: Pairs = {
            pairs: [],
        };

        for (const address of addresses) {
            const statePair = { ...this.pairs.get(address) };

            if (!statePair) {
                throw new Error(`Pair ${address} not found`);
            }

            if (fields.length === 0) {
                result.pairs.push(statePair);
                continue;
            }

            const pair: Partial<PairModel> = {};
            for (const field of fields) {
                pair[field] = statePair[field];
            }

            result.pairs.push(pair as PairModel);
        }

        profiler.stop();
        console.log('SERVER GET PAIRS', profiler.duration);

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

            if (firstTokenID && secondTokenID) {
                if (
                    ![firstTokenID, secondTokenID].includesEvery([
                        pair.firstTokenId,
                        pair.secondTokenId,
                    ])
                ) {
                    return;
                }
            } else if (firstTokenID && pair.firstTokenId !== firstTokenID) {
                return;
            } else if (secondTokenID && pair.secondTokenId !== secondTokenID) {
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

    getPairsTokens(request: GetPairsAndTokensRequest): PairsAndTokensResponse {
        const { addresses, pairFields, tokenFields } = request;

        const pairTokenFields = [
            'firstTokenId',
            'secondTokenId',
            'liquidityPoolTokenId',
        ];

        const pairFieldsIncludingTokenIds = pairFields?.paths ?? [];
        const pairFieldsToRemove: string[] = [];

        if (pairFieldsIncludingTokenIds.length) {
            pairTokenFields.forEach((field) => {
                if (!pairFieldsIncludingTokenIds.includes(field)) {
                    pairFieldsIncludingTokenIds.push(field);
                    pairFieldsToRemove.push(field);
                }
            });
        }

        const { pairs } = this.getPairs(addresses, pairFieldsIncludingTokenIds);

        let tokenIds: string[] = [];
        pairs.forEach((pair) => {
            tokenIds.push(pair.firstTokenId);
            tokenIds.push(pair.secondTokenId);
            if (pair.liquidityPoolTokenId) {
                tokenIds.push(pair.liquidityPoolTokenId);
            }
        });

        tokenIds = [...new Set(tokenIds)];

        const { tokens: firstTokens } = this.getTokens(
            pairs.map((pair) => pair.firstTokenId),
            tokenFields?.paths ?? [],
        );
        const { tokens: secondTokens } = this.getTokens(
            pairs.map((pair) => pair.secondTokenId),
            tokenFields?.paths ?? [],
        );
        const { tokens: lpTokens } = this.getTokens(
            pairs.map((pair) => pair.liquidityPoolTokenId),
            tokenFields?.paths ?? [],
        );

        const pairsWithTokens: PairAndTokens[] = pairs.map((pair, index) => {
            const responsePair = { ...pair };

            if (pairFieldsToRemove.length) {
                pairFieldsToRemove.forEach((field) => {
                    delete responsePair[field];
                });
            }
            return {
                pair: responsePair,
                firstToken: firstTokens[index],
                secondToken: secondTokens[index],
                ...(lpTokens[index] && { lpToken: lpTokens[index] }),
            };
        });

        return { pairsWithTokens };
    }

    addPair(request: AddPairRequest): void {
        const { pair, firstToken, secondToken } = request;

        this.pairs.set(pair.address, { ...pair });

        if (!this.tokens.has(firstToken.identifier)) {
            this.tokens.set(firstToken.identifier, { ...firstToken });
            this.tokensByType
                .get(firstToken.type as EsdtTokenType)
                .push(firstToken.identifier);
        }

        if (!this.tokens.has(secondToken.identifier)) {
            this.tokens.set(secondToken.identifier, { ...secondToken });
            this.tokensByType
                .get(secondToken.type as EsdtTokenType)
                .push(secondToken.identifier);
        }

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

        this.recomputeValues();
    }

    addPairLpToken(request: AddPairLpTokenRequest): void {
        const { address, token } = request;

        const pair = { ...this.pairs.get(address) };

        pair.liquidityPoolTokenId = token.identifier;

        this.tokens.set(token.identifier, { ...token });
        this.pairs.set(address, pair);

        this.recomputeValues();
    }

    updatePairs(request: UpdatePairsRequest): UpdatePairsResponse {
        const { pairs: partialPairs, updateMask } = request;

        const updatedPairs = new Map<string, PairModel>();
        const failedAddresses: string[] = [];

        const nonUpdateableFields = [
            'address',
            'firstTokenId',
            'secondTokenId',
            'liquidityPoolTokenId',
        ];

        for (const partial of partialPairs) {
            if (!partial.address) {
                continue;
            }

            const pair = { ...this.pairs.get(partial.address) };

            if (!pair) {
                failedAddresses.push(partial.address);
                continue;
            }

            for (const field of updateMask.paths) {
                if (partial[field] === undefined) {
                    continue;
                }

                if (nonUpdateableFields.includes(field)) {
                    continue;
                }

                if (field === 'info') {
                    const currentReserves: PairInfoModel = {
                        reserves0:
                            partial.info.reserves0 ?? pair.info.reserves0,
                        reserves1:
                            partial.info.reserves1 ?? pair.info.reserves1,
                        totalSupply:
                            partial.info.totalSupply ?? pair.info.totalSupply,
                    };
                    pair.info = currentReserves;
                } else {
                    pair[field] = partial[field];
                }
            }

            updatedPairs.set(partial.address, pair);
        }

        if (updatedPairs.size > 0) {
            updatedPairs.forEach((pair, address) => {
                this.pairs.set(address, pair);
            });
        }

        const tokensWithPriceUpdates = this.recomputeValues();

        return {
            failedAddresses,
            tokensWithPriceUpdates,
            updatedCount: updatedPairs.size,
        };
    }

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

            const stateToken = { ...this.tokens.get(tokenID) };

            if (!stateToken) {
                throw new Error(`Token ${tokenID} not found`);
            }

            if (fields.length === 0) {
                result.tokens.push(stateToken);
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
            .get(EsdtTokenType.FungibleToken)
            .filter((token) => {
                if (enabledSwaps && !this.activePairsTokens.has(token)) {
                    return false;
                }

                if (identifiers && !identifiers.includes(token)) {
                    return false;
                }

                let currentToken: EsdtToken;
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

    updateTokens(request: UpdateTokensRequest): UpdateTokensResponse {
        const { tokens: partialTokens, updateMask } = request;

        const updatedTokens = new Map<string, EsdtToken>();
        const failedIdentifiers: string[] = [];

        const nonUpdateableFields = ['identifier', 'decimals', 'type'];

        for (const partial of partialTokens) {
            if (!partial.identifier) {
                continue;
            }

            const token = { ...this.tokens.get(partial.identifier) };

            if (!token) {
                failedIdentifiers.push(partial.identifier);
                continue;
            }

            for (const field of updateMask.paths) {
                if (partial[field] === undefined) {
                    continue;
                }

                if (nonUpdateableFields.includes(field)) {
                    continue;
                }

                token[field] = partial[field];
            }

            updatedTokens.set(partial.identifier, token);
        }

        if (updatedTokens.size > 0) {
            updatedTokens.forEach((token, identifier) => {
                this.tokens.set(identifier, token);
            });
        }

        this.recomputeValues();

        return {
            failedIdentifiers,
            updatedCount: updatedTokens.size,
        };
    }

    private recomputeValues(): string[] {
        return this.bulkUpdatesService.recomputeAllValues(
            this.pairs,
            this.tokens,
            this.usdcPrice,
            this.commonTokenIDs,
        );
    }
}
