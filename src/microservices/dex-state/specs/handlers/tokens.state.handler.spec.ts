import { Test, TestingModule } from '@nestjs/testing';
import { TokensStateHandler } from '../../services/handlers/tokens.state.handler';
import { StateStore } from '../../services/state.store';
import { Tokens, TEST_TOKEN_IDS } from '../test.utils';
import { TokenSortField, SortOrder, GetFilteredTokensRequest } from '../../interfaces/dex_state.interfaces';
import { EsdtTokenType } from 'src/modules/tokens/models/esdtToken.model';

describe('TokensStateHandler', () => {
    let handler: TokensStateHandler;
    let stateStore: StateStore;

    // Helper function to create a default GetFilteredTokensRequest
    const createFilterRequest = (overrides: Partial<GetFilteredTokensRequest> = {}): GetFilteredTokensRequest => ({
        enabledSwaps: false,
        identifiers: [],
        searchToken: '',
        minLiquidity: 0,
        type: '',
        sortField: TokenSortField.TOKENS_SORT_UNSPECIFIED,
        sortOrder: SortOrder.SORT_ASC,
        offset: 0,
        limit: 100,
        fields: { paths: [] },
        ...overrides,
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TokensStateHandler, StateStore],
        }).compile();

        handler = module.get<TokensStateHandler>(TokensStateHandler);
        stateStore = module.get<StateStore>(StateStore);

        // Populate state store with test tokens
        const wegld = Tokens(TEST_TOKEN_IDS.WEGLD);
        const mex = Tokens(TEST_TOKEN_IDS.MEX);
        const usdc = Tokens(TEST_TOKEN_IDS.USDC);
        const usdt = Tokens(TEST_TOKEN_IDS.USDT);

        // Add additional data for filtering/sorting tests
        wegld.liquidityUSD = '10000000';
        wegld.volumeUSD24h = '500000';
        wegld.swapCount24h = 1000;
        mex.liquidityUSD = '5000000';
        mex.volumeUSD24h = '300000';
        mex.swapCount24h = 500;
        usdc.liquidityUSD = '8000000';
        usdc.volumeUSD24h = '400000';
        usdc.swapCount24h = 800;
        usdt.liquidityUSD = '100000'; // Below minLiquidity threshold
        usdt.volumeUSD24h = '10000';
        usdt.swapCount24h = 50;

        stateStore.setToken(TEST_TOKEN_IDS.WEGLD, wegld);
        stateStore.setToken(TEST_TOKEN_IDS.MEX, mex);
        stateStore.setToken(TEST_TOKEN_IDS.USDC, usdc);
        stateStore.setToken(TEST_TOKEN_IDS.USDT, usdt);

        // Set up tokensByType for FungibleToken
        stateStore.tokensByType.set(EsdtTokenType.FungibleToken, [
            TEST_TOKEN_IDS.WEGLD,
            TEST_TOKEN_IDS.MEX,
            TEST_TOKEN_IDS.USDC,
            TEST_TOKEN_IDS.USDT,
        ]);

        // Set up activePairsTokens (tokens enabled for swaps)
        stateStore.activePairsTokens.add(TEST_TOKEN_IDS.WEGLD);
        stateStore.activePairsTokens.add(TEST_TOKEN_IDS.MEX);
        stateStore.activePairsTokens.add(TEST_TOKEN_IDS.USDC);
        // USDT not in activePairsTokens
    });

    describe('getTokens', () => {
        it('should throw error when token not found', () => {
            const unknownTokenID = 'UNKNOWN-123456';

            expect(() => handler.getTokens([unknownTokenID])).toThrow(
                `Token ${unknownTokenID} not found`,
            );
        });

        it('should handle undefined tokenID gracefully', () => {
            const result = handler.getTokens([undefined]);

            expect(result).toBeDefined();
            expect(result.tokens).toHaveLength(1);
            expect(result.tokens[0]).toBeUndefined();
        });

        it('should return full tokens when fields not specified', () => {
            const result = handler.getTokens([TEST_TOKEN_IDS.WEGLD]);

            expect(result).toBeDefined();
            expect(result.tokens).toHaveLength(1);
            expect(result.tokens[0].identifier).toBe(TEST_TOKEN_IDS.WEGLD);
            expect(result.tokens[0].name).toBe('WrappedEgld');
            expect(result.tokens[0].decimals).toBe(18);
        });

        it('should return partial tokens with only requested fields', () => {
            const result = handler.getTokens([TEST_TOKEN_IDS.WEGLD], ['identifier', 'name']);

            expect(result).toBeDefined();
            expect(result.tokens).toHaveLength(1);
            expect(result.tokens[0].identifier).toBe(TEST_TOKEN_IDS.WEGLD);
            expect(result.tokens[0].name).toBe('WrappedEgld');
            expect(result.tokens[0].decimals).toBeUndefined();
        });

        it('should handle multiple tokens', () => {
            const result = handler.getTokens([
                TEST_TOKEN_IDS.WEGLD,
                TEST_TOKEN_IDS.MEX,
            ]);

            expect(result).toBeDefined();
            expect(result.tokens).toHaveLength(2);
            expect(result.tokens[0].identifier).toBe(TEST_TOKEN_IDS.WEGLD);
            expect(result.tokens[1].identifier).toBe(TEST_TOKEN_IDS.MEX);
        });
    });

    describe('getAllTokens', () => {
        it('should return empty array when no tokens exist', () => {
            stateStore.clearAll();

            const result = handler.getAllTokens();

            expect(result).toBeDefined();
            expect(result.tokens).toHaveLength(0);
        });

        it('should return all tokens when tokens exist', () => {
            const result = handler.getAllTokens();

            expect(result).toBeDefined();
            expect(result.tokens).toHaveLength(4);
        });
    });

    describe('getFilteredTokens', () => {
        it('should filter by enabledSwaps', () => {
            const request = createFilterRequest({
                enabledSwaps: true,
            });

            const result = handler.getFilteredTokens(request);

            expect(result.tokens).toHaveLength(3); // WEGLD, MEX, USDC (USDT excluded)
            expect(result.count).toBe(3);
            expect(result.tokens.some(t => t.identifier === TEST_TOKEN_IDS.USDT)).toBe(false);
        });

        it('should filter by identifiers', () => {
            const request = createFilterRequest({
                identifiers: [TEST_TOKEN_IDS.WEGLD, TEST_TOKEN_IDS.MEX],
            });

            const result = handler.getFilteredTokens(request);

            expect(result.tokens).toHaveLength(2);
            expect(result.count).toBe(2);
            expect(result.tokens[0].identifier).toBe(TEST_TOKEN_IDS.WEGLD);
            expect(result.tokens[1].identifier).toBe(TEST_TOKEN_IDS.MEX);
        });

        it('should filter by searchToken - case insensitive identifier match', () => {
            const request = createFilterRequest({
                searchToken: 'wegld',
            });

            const result = handler.getFilteredTokens(request);

            expect(result.tokens).toHaveLength(1);
            expect(result.tokens[0].identifier).toBe(TEST_TOKEN_IDS.WEGLD);
        });

        it('should filter by searchToken - case insensitive name match', () => {
            const request = createFilterRequest({
                searchToken: 'circle',
            });

            const result = handler.getFilteredTokens(request);

            expect(result.tokens).toHaveLength(1);
            expect(result.tokens[0].identifier).toBe(TEST_TOKEN_IDS.USDC);
        });

        it('should filter by minLiquidity', () => {
            const request = createFilterRequest({
                minLiquidity: 1000000,
            });

            const result = handler.getFilteredTokens(request);

            expect(result.tokens).toHaveLength(3); // WEGLD, MEX, USDC (USDT excluded)
            expect(result.count).toBe(3);
            expect(result.tokens.some(t => t.identifier === TEST_TOKEN_IDS.USDT)).toBe(false);
        });

        it('should combine multiple filters', () => {
            const request = createFilterRequest({
                enabledSwaps: true,
                identifiers: [TEST_TOKEN_IDS.WEGLD, TEST_TOKEN_IDS.MEX, TEST_TOKEN_IDS.USDT],
            });

            const result = handler.getFilteredTokens(request);

            // Should match: enabledSwaps (WEGLD, MEX) AND identifiers (WEGLD, MEX, USDT)
            // Result: WEGLD, MEX
            expect(result.tokens).toHaveLength(2);
            expect(result.count).toBe(2);
        });

        it('should sort by liquidity', () => {
            const request = createFilterRequest({
                sortField: TokenSortField.TOKENS_SORT_LIQUIDITY,
                sortOrder: SortOrder.SORT_DESC,
            });

            const result = handler.getFilteredTokens(request);

            expect(result.tokens).toHaveLength(4);
            // Order: WEGLD (10M), USDC (8M), MEX (5M), USDT (100K)
            expect(result.tokens[0].identifier).toBe(TEST_TOKEN_IDS.WEGLD);
            expect(result.tokens[1].identifier).toBe(TEST_TOKEN_IDS.USDC);
            expect(result.tokens[2].identifier).toBe(TEST_TOKEN_IDS.MEX);
            expect(result.tokens[3].identifier).toBe(TEST_TOKEN_IDS.USDT);
        });

        it('should sort by volume', () => {
            const request = createFilterRequest({
                sortField: TokenSortField.TOKENS_SORT_VOLUME,
                sortOrder: SortOrder.SORT_DESC,
            });

            const result = handler.getFilteredTokens(request);

            expect(result.tokens).toHaveLength(4);
            // Order: WEGLD (500K), USDC (400K), MEX (300K), USDT (10K)
            expect(result.tokens[0].identifier).toBe(TEST_TOKEN_IDS.WEGLD);
            expect(result.tokens[1].identifier).toBe(TEST_TOKEN_IDS.USDC);
        });

        it('should handle TOKENS_SORT_UNSPECIFIED', () => {
            const request = createFilterRequest({
                sortField: TokenSortField.TOKENS_SORT_UNSPECIFIED,
            });

            const result = handler.getFilteredTokens(request);

            expect(result.tokens).toHaveLength(4);
            // Should maintain original order from tokensByType
        });

        it('should paginate results with offset and limit', () => {
            const request = createFilterRequest({
                offset: 1,
                limit: 2,
            });

            const result = handler.getFilteredTokens(request);

            expect(result.tokens).toHaveLength(2);
            expect(result.count).toBe(4); // Total count should be 4
        });

        it('should return empty when no tokens match filters', () => {
            const request = createFilterRequest({
                searchToken: 'NONEXISTENT',
            });

            const result = handler.getFilteredTokens(request);

            expect(result.tokens).toHaveLength(0);
            expect(result.count).toBe(0);
        });

        it('should return empty when tokensByType is empty', () => {
            stateStore.tokensByType.set(EsdtTokenType.FungibleToken, []);

            const request = createFilterRequest();

            const result = handler.getFilteredTokens(request);

            expect(result.tokens).toHaveLength(0);
            expect(result.count).toBe(0);
        });
    });

    describe('updateTokens', () => {
        it('should update mutable fields correctly', () => {
            const request = {
                tokens: [
                    {
                        identifier: TEST_TOKEN_IDS.WEGLD,
                        price: '15',
                        liquidityUSD: '12000000',
                    } as any,
                ],
                updateMask: {
                    paths: ['price', 'liquidityUSD'],
                },
            };

            const response = handler.updateTokens(request);

            expect(response.updatedCount).toBe(1);
            expect(response.failedIdentifiers).toHaveLength(0);

            const token = stateStore.tokens.get(TEST_TOKEN_IDS.WEGLD);
            expect(token.price).toBe('15');
            expect(token.liquidityUSD).toBe('12000000');
        });

        it('should skip immutable field updates', () => {
            const originalIdentifier = TEST_TOKEN_IDS.WEGLD;
            const originalDecimals = 18;
            const originalType = 'FungibleESDT';

            const request = {
                tokens: [
                    {
                        identifier: TEST_TOKEN_IDS.WEGLD,
                        decimals: 6,
                        type: 'MetaESDT',
                        price: '15',
                    } as any,
                ],
                updateMask: {
                    paths: ['identifier', 'decimals', 'type', 'price'],
                },
            };

            handler.updateTokens(request);

            const token = stateStore.tokens.get(TEST_TOKEN_IDS.WEGLD);
            expect(token.identifier).toBe(originalIdentifier); // Should not change
            expect(token.decimals).toBe(originalDecimals); // Should not change
            expect(token.type).toBe(originalType); // Should not change
            expect(token.price).toBe('15'); // Should change
        });

        it('should return failedIdentifiers for non-existent tokens', () => {
            const unknownTokenID = 'UNKNOWN-123456';

            const request = {
                tokens: [
                    {
                        identifier: unknownTokenID,
                        price: '15',
                    } as any,
                ],
                updateMask: {
                    paths: ['price'],
                },
            };

            const response = handler.updateTokens(request);

            expect(response.updatedCount).toBe(0);
            expect(response.failedIdentifiers).toHaveLength(1);
            expect(response.failedIdentifiers[0]).toBe(unknownTokenID);
        });

        it('should handle batch updates', () => {
            const request = {
                tokens: [
                    {
                        identifier: TEST_TOKEN_IDS.WEGLD,
                        price: '15',
                    } as any,
                    {
                        identifier: TEST_TOKEN_IDS.MEX,
                        price: '0.02',
                    } as any,
                ],
                updateMask: {
                    paths: ['price'],
                },
            };

            const response = handler.updateTokens(request);

            expect(response.updatedCount).toBe(2);
            expect(response.failedIdentifiers).toHaveLength(0);

            expect(stateStore.tokens.get(TEST_TOKEN_IDS.WEGLD).price).toBe('15');
            expect(stateStore.tokens.get(TEST_TOKEN_IDS.MEX).price).toBe('0.02');
        });

        it('should skip tokens with missing identifier', () => {
            const request = {
                tokens: [
                    {
                        identifier: undefined,
                        price: '15',
                    } as any,
                    {
                        identifier: TEST_TOKEN_IDS.WEGLD,
                        price: '20',
                    } as any,
                ],
                updateMask: {
                    paths: ['price'],
                },
            };

            const response = handler.updateTokens(request);

            expect(response.updatedCount).toBe(1); // Only 1 succeeded
            expect(response.failedIdentifiers).toHaveLength(0); // Missing identifier not added to failed
        });

        it('should return correct updatedCount', () => {
            const request = {
                tokens: [
                    {
                        identifier: TEST_TOKEN_IDS.WEGLD,
                        price: '15',
                    } as any,
                    {
                        identifier: TEST_TOKEN_IDS.MEX,
                        price: '0.02',
                    } as any,
                    {
                        identifier: 'UNKNOWN-123456',
                        price: '100',
                    } as any,
                ],
                updateMask: {
                    paths: ['price'],
                },
            };

            const response = handler.updateTokens(request);

            expect(response.updatedCount).toBe(2); // Only 2 succeeded
            expect(response.failedIdentifiers).toHaveLength(1);
        });
    });
});
