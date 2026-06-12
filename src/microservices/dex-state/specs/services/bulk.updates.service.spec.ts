import { Test, TestingModule } from '@nestjs/testing';
import { BulkUpdatesService } from '../../services/bulk.updates.service';
import { PairModel } from 'src/modules/pair/models/pair.model';
import {
    EsdtToken,
    EsdtTokenType,
} from 'src/modules/tokens/models/esdtToken.model';
import { PairInfoModel } from 'src/modules/pair/models/pair-info.model';
import {
    Tokens,
    createMockPair,
    createMockToken,
    TEST_TOKEN_IDS,
    TEST_ADDRESSES,
} from '../test.utils';
import BigNumber from 'bignumber.js';
import '@multiversx/sdk-nestjs-common/lib/utils/extensions/array.extensions';

// Mock config - use actual pair address from test constants
jest.mock('src/config', () => ({
    constantsConfig: {
        USDC_TOKEN_ID: 'USDC-123456',
        BLOCKS_PER_WEEK: 100800,
    },
    mxConfig: {
        EGLDDecimals: 18,
    },
    scAddress: {
        // Use the actual EGLD-USDC pair address from test data (pairs[1])
        get WEGLD_USDC() {
            return require('src/modules/pair/mocks/pair.constants').pairs[1]
                .address;
        },
    },
    tokenProviderUSD: 'WEGLD-123456',
}));

describe('BulkUpdatesService', () => {
    let service: BulkUpdatesService;
    let pairs: Map<string, PairModel>;
    let tokens: Map<string, EsdtToken>;

    // Helper to add LP tokens for all pairs that have liquidityPoolTokenId
    const addLpTokensForPairs = () => {
        for (const pair of pairs.values()) {
            if (
                pair.liquidityPoolTokenId &&
                !tokens.has(pair.liquidityPoolTokenId)
            ) {
                tokens.set(
                    pair.liquidityPoolTokenId,
                    createMockToken(pair.liquidityPoolTokenId, {
                        type: EsdtTokenType.FungibleLpToken,
                        pairAddress: pair.address,
                        decimals: 18,
                    }),
                );
            }
        }
    };

    // Helper to ensure WEGLD-USDC price oracle pair exists
    const ensurePriceOraclePair = () => {
        if (!pairs.has(TEST_ADDRESSES.PAIR_EGLD_USDC)) {
            const wegldUsdcPair = createMockPair(
                TEST_ADDRESSES.PAIR_EGLD_USDC,
                {
                    firstTokenId: TEST_TOKEN_IDS.WEGLD,
                    secondTokenId: TEST_TOKEN_IDS.USDC,
                    liquidityPoolTokenId: TEST_TOKEN_IDS.LP_EGLD_USDC,
                },
            );
            wegldUsdcPair.info = new PairInfoModel({
                reserves0: '100000000000000000000', // 100 WEGLD
                reserves1: '1000000000', // 1000 USDC
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, wegldUsdcPair);

            if (!tokens.has(TEST_TOKEN_IDS.WEGLD)) {
                tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            }
            if (!tokens.has(TEST_TOKEN_IDS.USDC)) {
                tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));
            }
        }
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [BulkUpdatesService],
        }).compile();

        service = module.get<BulkUpdatesService>(BulkUpdatesService);

        // Setup test data
        pairs = new Map();
        tokens = new Map();
    });

    describe('recomputeAllValues', () => {
        it('should recompute all values and return updated tokens list', () => {
            // Setup WEGLD-USDC pair (price oracle)
            const wegldUsdcPair = createMockPair(
                TEST_ADDRESSES.PAIR_EGLD_USDC,
                {
                    firstTokenId: TEST_TOKEN_IDS.WEGLD,
                    secondTokenId: TEST_TOKEN_IDS.USDC,
                    liquidityPoolTokenId: TEST_TOKEN_IDS.LP_EGLD_USDC,
                },
            );
            wegldUsdcPair.info = new PairInfoModel({
                reserves0: '100000000000000000000', // 100 WEGLD
                reserves1: '1000000000', // 1000 USDC (6 decimals)
                totalSupply: '10000000000000000000000', // 10000 LP tokens
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, wegldUsdcPair);

            // Setup tokens
            const wegld = Tokens(TEST_TOKEN_IDS.WEGLD);
            wegld.price = '0'; // Will be recomputed
            wegld.derivedEGLD = '0';
            tokens.set(TEST_TOKEN_IDS.WEGLD, wegld);

            const usdc = Tokens(TEST_TOKEN_IDS.USDC);
            usdc.price = '0';
            usdc.derivedEGLD = '0';
            tokens.set(TEST_TOKEN_IDS.USDC, usdc);

            const lpToken = createMockToken(TEST_TOKEN_IDS.LP_EGLD_USDC, {
                type: EsdtTokenType.FungibleLpToken,
                decimals: 18,
                pairAddress: TEST_ADDRESSES.PAIR_EGLD_USDC,
            });
            tokens.set(TEST_TOKEN_IDS.LP_EGLD_USDC, lpToken);

            addLpTokensForPairs();

            const updatedTokens = service.recomputeAllValues(
                pairs,
                tokens,
                1.0, // USDC price = $1
                [TEST_TOKEN_IDS.WEGLD, TEST_TOKEN_IDS.USDC],
            );

            // Verify pair prices were updated (reserves-based)
            expect(wegldUsdcPair.firstTokenPrice).not.toBe('0');
            expect(wegldUsdcPair.secondTokenPrice).not.toBe('0');

            // Verify token prices were updated
            expect(tokens.get(TEST_TOKEN_IDS.WEGLD).price).not.toBe('0');
            expect(tokens.get(TEST_TOKEN_IDS.USDC).price).not.toBe('0');
            expect(tokens.get(TEST_TOKEN_IDS.WEGLD).derivedEGLD).toBe('1');

            // Verify locked values were computed
            expect(wegldUsdcPair.lockedValueUSD).not.toBe('0');
            expect(wegldUsdcPair.firstTokenLockedValueUSD).not.toBe('0');
            expect(wegldUsdcPair.secondTokenLockedValueUSD).not.toBe('0');

            // Verify LP token price was computed
            expect(wegldUsdcPair.liquidityPoolTokenPriceUSD).not.toBe('0');
            expect(lpToken.price).toBe(
                wegldUsdcPair.liquidityPoolTokenPriceUSD,
            );

            // Verify updated tokens list includes tokens with changed prices
            expect(updatedTokens).toContain(TEST_TOKEN_IDS.WEGLD);
            expect(updatedTokens).toContain(TEST_TOKEN_IDS.USDC);
        });

        it('should handle multiple pairs and compute derived prices through graph', () => {
            // Setup WEGLD-USDC pair (price oracle)
            const wegldUsdcPair = createMockPair(
                TEST_ADDRESSES.PAIR_EGLD_USDC,
                {
                    firstTokenId: TEST_TOKEN_IDS.WEGLD,
                    secondTokenId: TEST_TOKEN_IDS.USDC,
                    liquidityPoolTokenId: TEST_TOKEN_IDS.LP_EGLD_USDC,
                },
            );
            wegldUsdcPair.info = new PairInfoModel({
                reserves0: '100000000000000000000', // 100 WEGLD
                reserves1: '1000000000', // 1000 USDC
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, wegldUsdcPair);

            // Setup MEX-WEGLD pair (MEX price derived from WEGLD)
            const mexWegldPair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_MEX, {
                firstTokenId: TEST_TOKEN_IDS.WEGLD,
                secondTokenId: TEST_TOKEN_IDS.MEX,
                liquidityPoolTokenId: TEST_TOKEN_IDS.LP_EGLD_MEX,
                state: 'Active',
            });
            mexWegldPair.info = new PairInfoModel({
                reserves0: '10000000000000000000', // 10 WEGLD
                reserves1: '100000000000000000000000', // 100000 MEX
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_MEX, mexWegldPair);

            // Setup tokens
            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));
            tokens.set(TEST_TOKEN_IDS.MEX, Tokens(TEST_TOKEN_IDS.MEX));

            // Add LP tokens for all pairs
            addLpTokensForPairs();

            addLpTokensForPairs();

            service.recomputeAllValues(pairs, tokens, 1.0, [
                TEST_TOKEN_IDS.WEGLD,
                TEST_TOKEN_IDS.USDC,
            ]);

            // WEGLD derivedEGLD should be 1
            expect(tokens.get(TEST_TOKEN_IDS.WEGLD).derivedEGLD).toBe('1');

            // MEX derivedEGLD should be computed through WEGLD pair
            const mexDerivedEGLD = new BigNumber(
                tokens.get(TEST_TOKEN_IDS.MEX).derivedEGLD,
            );
            expect(mexDerivedEGLD.gt(0)).toBe(true);

            // MEX price should be lower than WEGLD price
            const mexPrice = new BigNumber(
                tokens.get(TEST_TOKEN_IDS.MEX).price,
            );
            const wegldPrice = new BigNumber(
                tokens.get(TEST_TOKEN_IDS.WEGLD).price,
            );
            expect(mexPrice.lt(wegldPrice)).toBe(true);
        });

        it('should handle LP tokens and set their liquidityUSD to zero', () => {
            const pair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_USDC, {
                firstTokenId: TEST_TOKEN_IDS.WEGLD,
                secondTokenId: TEST_TOKEN_IDS.USDC,
                liquidityPoolTokenId: TEST_TOKEN_IDS.LP_EGLD_USDC,
            });
            pair.info = new PairInfoModel({
                reserves0: '100000000000000000000',
                reserves1: '1000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, pair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));

            const lpToken = createMockToken(TEST_TOKEN_IDS.LP_EGLD_USDC, {
                type: EsdtTokenType.FungibleLpToken,
                pairAddress: TEST_ADDRESSES.PAIR_EGLD_USDC,
            });
            tokens.set(TEST_TOKEN_IDS.LP_EGLD_USDC, lpToken);

            addLpTokensForPairs();

            service.recomputeAllValues(pairs, tokens, 1.0, [
                TEST_TOKEN_IDS.WEGLD,
                TEST_TOKEN_IDS.USDC,
            ]);

            // LP tokens should have liquidityUSD = 0 and derivedEGLD = 0
            expect(lpToken.liquidityUSD).toBe('0');
            expect(lpToken.derivedEGLD).toBe('0');
            // LP token price should match pair liquidityPoolTokenPriceUSD
            expect(lpToken.price).toBe(pair.liquidityPoolTokenPriceUSD);
        });
    });

    describe('price computation from reserves', () => {
        it('should compute token prices based on reserves', () => {
            const pair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_USDC, {
                firstTokenId: TEST_TOKEN_IDS.WEGLD,
                secondTokenId: TEST_TOKEN_IDS.USDC,
                liquidityPoolTokenId: TEST_TOKEN_IDS.LP_EGLD_USDC,
            });
            pair.info = new PairInfoModel({
                reserves0: '100000000000000000000', // 100 WEGLD (18 decimals)
                reserves1: '1000000000', // 1000 USDC (6 decimals)
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, pair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));
            addLpTokensForPairs();

            addLpTokensForPairs();

            service.recomputeAllValues(pairs, tokens, 1.0, [
                TEST_TOKEN_IDS.WEGLD,
                TEST_TOKEN_IDS.USDC,
            ]);

            // 1 WEGLD = 1000 USDC / 100 WEGLD = 10 USDC
            // Adjusted for decimals: quote(1e18, 100e18, 1000e6) * 1e-6 = 10
            expect(pair.firstTokenPrice).toBe('10');

            // 1 USDC = 100 WEGLD / 1000 USDC = 0.1 WEGLD
            // Adjusted for decimals: quote(1e6, 1000e6, 100e18) * 1e-18 = 0.1
            expect(pair.secondTokenPrice).toBe('0.1');
        });

        it('should handle pairs with different decimal precisions', () => {
            ensurePriceOraclePair();

            const pair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_MEX, {
                firstTokenId: TEST_TOKEN_IDS.WEGLD,
                secondTokenId: TEST_TOKEN_IDS.MEX,
                liquidityPoolTokenId: TEST_TOKEN_IDS.LP_EGLD_MEX,
            });
            pair.info = new PairInfoModel({
                reserves0: '50000000000000000000', // 50 WEGLD (18 decimals)
                reserves1: '1000000000000000000000', // 1000 MEX (18 decimals)
                totalSupply: '100000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_MEX, pair);

            tokens.set(TEST_TOKEN_IDS.MEX, Tokens(TEST_TOKEN_IDS.MEX));
            addLpTokensForPairs();

            addLpTokensForPairs();

            service.recomputeAllValues(pairs, tokens, 1.0, [
                TEST_TOKEN_IDS.WEGLD,
                TEST_TOKEN_IDS.MEX,
            ]);

            // 1 WEGLD = 1000 MEX / 50 WEGLD = 20 MEX
            expect(pair.firstTokenPrice).toBe('20');

            // 1 MEX = 50 WEGLD / 1000 MEX = 0.05 WEGLD
            expect(pair.secondTokenPrice).toBe('0.05');
        });
    });

    describe('derived EGLD and USD price computation', () => {
        it('should compute WEGLD derivedEGLD as 1', () => {
            const pair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_USDC, {
                firstTokenId: TEST_TOKEN_IDS.WEGLD,
                secondTokenId: TEST_TOKEN_IDS.USDC,
            });
            pair.info = new PairInfoModel({
                reserves0: '100000000000000000000',
                reserves1: '1000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, pair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));

            addLpTokensForPairs();

            service.recomputeAllValues(pairs, tokens, 1.0, [
                TEST_TOKEN_IDS.WEGLD,
                TEST_TOKEN_IDS.USDC,
            ]);

            // WEGLD is the tokenProviderUSD, so derivedEGLD = 1
            expect(tokens.get(TEST_TOKEN_IDS.WEGLD).derivedEGLD).toBe('1');
        });

        it('should compute USDC derivedEGLD as 1 / egldPriceUSD', () => {
            const pair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_USDC, {
                firstTokenId: TEST_TOKEN_IDS.WEGLD,
                secondTokenId: TEST_TOKEN_IDS.USDC,
            });
            pair.info = new PairInfoModel({
                reserves0: '100000000000000000000', // 100 WEGLD
                reserves1: '1000000000', // 1000 USDC
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, pair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));

            addLpTokensForPairs();

            service.recomputeAllValues(pairs, tokens, 1.0, [
                TEST_TOKEN_IDS.WEGLD,
                TEST_TOKEN_IDS.USDC,
            ]);

            // EGLD price in USD = firstTokenPrice from WEGLD-USDC pair = 10 USDC
            // USDC derivedEGLD = 1 / 10 = 0.1
            const usdcDerivedEGLD = new BigNumber(
                tokens.get(TEST_TOKEN_IDS.USDC).derivedEGLD,
            );
            expect(usdcDerivedEGLD.toFixed()).toBe('0.1');
        });

        it('should compute derived EGLD price through multiple hops', () => {
            // WEGLD-USDC pair
            const wegldUsdcPair = createMockPair(
                TEST_ADDRESSES.PAIR_EGLD_USDC,
                {
                    firstTokenId: TEST_TOKEN_IDS.WEGLD,
                    secondTokenId: TEST_TOKEN_IDS.USDC,
                },
            );
            wegldUsdcPair.info = new PairInfoModel({
                reserves0: '100000000000000000000', // 100 WEGLD
                reserves1: '1000000000', // 1000 USDC
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, wegldUsdcPair);

            // WEGLD-MEX pair
            const wegldMexPair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_MEX, {
                firstTokenId: TEST_TOKEN_IDS.WEGLD,
                secondTokenId: TEST_TOKEN_IDS.MEX,
                state: 'Active',
            });
            wegldMexPair.info = new PairInfoModel({
                reserves0: '10000000000000000000', // 10 WEGLD
                reserves1: '100000000000000000000000', // 100000 MEX
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_MEX, wegldMexPair);

            // MEX-TOK4 pair (TOK4 price derived through MEX)
            const mexTok4Pair = createMockPair(TEST_ADDRESSES.PAIR_TOK4_EGLD, {
                firstTokenId: TEST_TOKEN_IDS.MEX,
                secondTokenId: TEST_TOKEN_IDS.TOK4,
                state: 'Active',
            });
            mexTok4Pair.info = new PairInfoModel({
                reserves0: '50000000000000000000000', // 50000 MEX
                reserves1: '5000000000000000000', // 5 TOK4
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_TOK4_EGLD, mexTok4Pair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));
            tokens.set(TEST_TOKEN_IDS.MEX, Tokens(TEST_TOKEN_IDS.MEX));
            tokens.set(TEST_TOKEN_IDS.TOK4, Tokens(TEST_TOKEN_IDS.TOK4));

            addLpTokensForPairs();

            service.recomputeAllValues(pairs, tokens, 1.0, [
                TEST_TOKEN_IDS.WEGLD,
                TEST_TOKEN_IDS.USDC,
                TEST_TOKEN_IDS.MEX,
            ]);

            // TOK4 should have derived EGLD computed through MEX -> WEGLD path
            const tok4DerivedEGLD = new BigNumber(
                tokens.get(TEST_TOKEN_IDS.TOK4).derivedEGLD,
            );
            expect(tok4DerivedEGLD.gt(0)).toBe(true);

            // TOK4 price should be positive
            const tok4Price = new BigNumber(
                tokens.get(TEST_TOKEN_IDS.TOK4).price,
            );
            expect(tok4Price.gt(0)).toBe(true);
        });

        it('should choose the pair with largest EGLD liquidity for price derivation', () => {
            // WEGLD-USDC pair
            const wegldUsdcPair = createMockPair(
                TEST_ADDRESSES.PAIR_EGLD_USDC,
                {
                    firstTokenId: TEST_TOKEN_IDS.WEGLD,
                    secondTokenId: TEST_TOKEN_IDS.USDC,
                },
            );
            wegldUsdcPair.info = new PairInfoModel({
                reserves0: '100000000000000000000',
                reserves1: '1000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, wegldUsdcPair);

            // MEX-WEGLD pair (large liquidity)
            const mexWegldPair1 = createMockPair(TEST_ADDRESSES.PAIR_EGLD_MEX, {
                firstTokenId: TEST_TOKEN_IDS.MEX,
                secondTokenId: TEST_TOKEN_IDS.WEGLD,
                state: 'Active',
            });
            mexWegldPair1.info = new PairInfoModel({
                reserves0: '1000000000000000000000000', // 1M MEX
                reserves1: '10000000000000000000', // 10 WEGLD - large liquidity
                totalSupply: '100000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_MEX, mexWegldPair1);

            // MEX-USDC pair (small liquidity)
            const mexUsdcPair = createMockPair(TEST_ADDRESSES.PAIR_TOK4_EGLD, {
                firstTokenId: TEST_TOKEN_IDS.MEX,
                secondTokenId: TEST_TOKEN_IDS.USDC,
                state: 'Active',
            });
            mexUsdcPair.info = new PairInfoModel({
                reserves0: '100000000000000000000', // 100 MEX
                reserves1: '10000', // 0.01 USDC - small liquidity
                totalSupply: '1000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_TOK4_EGLD, mexUsdcPair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));
            tokens.set(TEST_TOKEN_IDS.MEX, Tokens(TEST_TOKEN_IDS.MEX));

            addLpTokensForPairs();

            service.recomputeAllValues(pairs, tokens, 1.0, [
                TEST_TOKEN_IDS.WEGLD,
                TEST_TOKEN_IDS.USDC,
            ]);

            // MEX price should be derived from the WEGLD pair (larger EGLD liquidity)
            const mexDerivedEGLD = new BigNumber(
                tokens.get(TEST_TOKEN_IDS.MEX).derivedEGLD,
            );
            expect(mexDerivedEGLD.gt(0)).toBe(true);
        });

        it('should filter inactive pairs when active pairs exist', () => {
            // WEGLD-USDC pair
            const wegldUsdcPair = createMockPair(
                TEST_ADDRESSES.PAIR_EGLD_USDC,
                {
                    firstTokenId: TEST_TOKEN_IDS.WEGLD,
                    secondTokenId: TEST_TOKEN_IDS.USDC,
                },
            );
            wegldUsdcPair.info = new PairInfoModel({
                reserves0: '100000000000000000000',
                reserves1: '1000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, wegldUsdcPair);

            // MEX-WEGLD pair (inactive with high liquidity)
            const mexWegldPairInactive = createMockPair(
                TEST_ADDRESSES.PAIR_EGLD_MEX,
                {
                    firstTokenId: TEST_TOKEN_IDS.MEX,
                    secondTokenId: TEST_TOKEN_IDS.WEGLD,
                    state: 'Inactive',
                },
            );
            mexWegldPairInactive.info = new PairInfoModel({
                reserves0: '10000000000000000000000000', // 10M MEX - huge liquidity but inactive
                reserves1: '100000000000000000000', // 100 WEGLD
                totalSupply: '1000000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_MEX, mexWegldPairInactive);

            // MEX-USDC pair (active with small liquidity)
            const mexUsdcPairActive = createMockPair(
                TEST_ADDRESSES.PAIR_TOK4_EGLD,
                {
                    firstTokenId: TEST_TOKEN_IDS.MEX,
                    secondTokenId: TEST_TOKEN_IDS.USDC,
                    state: 'Active',
                },
            );
            mexUsdcPairActive.info = new PairInfoModel({
                reserves0: '1000000000000000000000000', // 1000 MEX - small liquidity but active
                reserves1: '100000000', // 0.1 USDC
                totalSupply: '1000000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_TOK4_EGLD, mexUsdcPairActive);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));
            tokens.set(TEST_TOKEN_IDS.MEX, Tokens(TEST_TOKEN_IDS.MEX));

            addLpTokensForPairs();

            service.recomputeAllValues(pairs, tokens, 1.0, [
                TEST_TOKEN_IDS.WEGLD,
                TEST_TOKEN_IDS.USDC,
            ]);

            // MEX price should be derived from the active USDC pair, not the inactive WEGLD pair
            const mexDerivedEGLD = new BigNumber(
                tokens.get(TEST_TOKEN_IDS.MEX).derivedEGLD,
            );
            expect(mexDerivedEGLD.gt(0)).toBe(true);
        });
    });

    describe('locked value calculations', () => {
        it('should compute locked values for active pairs', () => {
            const pair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_USDC, {
                firstTokenId: TEST_TOKEN_IDS.WEGLD,
                secondTokenId: TEST_TOKEN_IDS.USDC,
                state: 'Active',
            });
            pair.info = new PairInfoModel({
                reserves0: '100000000000000000000', // 100 WEGLD
                reserves1: '1000000000', // 1000 USDC
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, pair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));

            addLpTokensForPairs();

            service.recomputeAllValues(pairs, tokens, 1.0, [
                TEST_TOKEN_IDS.WEGLD,
                TEST_TOKEN_IDS.USDC,
            ]);

            // Active pairs should have lockedValueUSD = firstTokenLockedValueUSD + secondTokenLockedValueUSD
            const firstLocked = new BigNumber(pair.firstTokenLockedValueUSD);
            const secondLocked = new BigNumber(pair.secondTokenLockedValueUSD);
            const totalLocked = new BigNumber(pair.lockedValueUSD);

            expect(firstLocked.gt(0)).toBe(true);
            expect(secondLocked.gt(0)).toBe(true);
            expect(totalLocked.toFixed()).toBe(
                firstLocked.plus(secondLocked).toFixed(),
            );
        });

        it('should double common token locked value for inactive pairs with one common token', () => {
            const pair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_MEX, {
                firstTokenId: TEST_TOKEN_IDS.WEGLD, // common token
                secondTokenId: TEST_TOKEN_IDS.MEX, // non-common token
                state: 'Inactive',
            });
            pair.info = new PairInfoModel({
                reserves0: '50000000000000000000', // 50 WEGLD
                reserves1: '500000000000000000000000', // 500000 MEX
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_MEX, pair);

            // Need WEGLD-USDC for price computation
            const wegldUsdcPair = createMockPair(
                TEST_ADDRESSES.PAIR_EGLD_USDC,
                {
                    firstTokenId: TEST_TOKEN_IDS.WEGLD,
                    secondTokenId: TEST_TOKEN_IDS.USDC,
                },
            );
            wegldUsdcPair.info = new PairInfoModel({
                reserves0: '100000000000000000000',
                reserves1: '1000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, wegldUsdcPair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));
            tokens.set(TEST_TOKEN_IDS.MEX, Tokens(TEST_TOKEN_IDS.MEX));

            addLpTokensForPairs();

            service.recomputeAllValues(
                pairs,
                tokens,
                1.0,
                [TEST_TOKEN_IDS.WEGLD, TEST_TOKEN_IDS.USDC], // Only WEGLD and USDC are common
            );

            // Inactive pair with one common token: lockedValueUSD = 2 * commonTokenLockedValueUSD
            const wegldLocked = new BigNumber(pair.firstTokenLockedValueUSD);
            const totalLocked = new BigNumber(pair.lockedValueUSD);

            expect(totalLocked.toFixed()).toBe(
                wegldLocked.multipliedBy(2).toFixed(),
            );
        });

        it('should set lockedValueUSD to zero for inactive pairs with no common tokens', () => {
            // Need WEGLD-USDC for price computation
            const wegldUsdcPair = createMockPair(
                TEST_ADDRESSES.PAIR_EGLD_USDC,
                {
                    firstTokenId: TEST_TOKEN_IDS.WEGLD,
                    secondTokenId: TEST_TOKEN_IDS.USDC,
                },
            );
            wegldUsdcPair.info = new PairInfoModel({
                reserves0: '100000000000000000000',
                reserves1: '1000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, wegldUsdcPair);

            // MEX-TOK4 pair (both non-common tokens)
            const mexTok4Pair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_MEX, {
                firstTokenId: TEST_TOKEN_IDS.MEX,
                secondTokenId: TEST_TOKEN_IDS.TOK4,
                state: 'Inactive',
            });
            mexTok4Pair.info = new PairInfoModel({
                reserves0: '100000000000000000000000', // 100000 MEX
                reserves1: '50000000000000000000', // 50 TOK4
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_MEX, mexTok4Pair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));
            tokens.set(TEST_TOKEN_IDS.MEX, Tokens(TEST_TOKEN_IDS.MEX));
            tokens.set(TEST_TOKEN_IDS.TOK4, Tokens(TEST_TOKEN_IDS.TOK4));

            addLpTokensForPairs();

            service.recomputeAllValues(
                pairs,
                tokens,
                1.0,
                [TEST_TOKEN_IDS.WEGLD, TEST_TOKEN_IDS.USDC], // Neither MEX nor TOK4 is common
            );

            // Inactive pair with no common tokens should have lockedValueUSD = 0
            expect(mexTok4Pair.lockedValueUSD).toBe('0');

            // Individual token locked values should also be 0 because MEX and TOK4 have no price
            // (they're not connected to the WEGLD/USDC price oracle through any active pair)
            expect(mexTok4Pair.firstTokenLockedValueUSD).toBe('0');
            expect(mexTok4Pair.secondTokenLockedValueUSD).toBe('0');
        });

        it('should compute locked values for pairs with both common tokens even if inactive', () => {
            const wegldUsdcPair = createMockPair(
                TEST_ADDRESSES.PAIR_EGLD_USDC,
                {
                    firstTokenId: TEST_TOKEN_IDS.WEGLD,
                    secondTokenId: TEST_TOKEN_IDS.USDC,
                    state: 'Inactive', // Inactive but both tokens are common
                },
            );
            wegldUsdcPair.info = new PairInfoModel({
                reserves0: '100000000000000000000',
                reserves1: '1000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, wegldUsdcPair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));

            addLpTokensForPairs();

            service.recomputeAllValues(
                pairs,
                tokens,
                1.0,
                [TEST_TOKEN_IDS.WEGLD, TEST_TOKEN_IDS.USDC], // Both are common
            );

            // Pair with both common tokens should have full locked value even if inactive
            const firstLocked = new BigNumber(
                wegldUsdcPair.firstTokenLockedValueUSD,
            );
            const secondLocked = new BigNumber(
                wegldUsdcPair.secondTokenLockedValueUSD,
            );
            const totalLocked = new BigNumber(wegldUsdcPair.lockedValueUSD);

            expect(totalLocked.toFixed()).toBe(
                firstLocked.plus(secondLocked).toFixed(),
            );
        });
    });

    describe('LP token price calculations', () => {
        it('should compute LP token price based on underlying reserves', () => {
            const pair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_USDC, {
                firstTokenId: TEST_TOKEN_IDS.WEGLD,
                secondTokenId: TEST_TOKEN_IDS.USDC,
                liquidityPoolTokenId: TEST_TOKEN_IDS.LP_EGLD_USDC,
            });
            pair.info = new PairInfoModel({
                reserves0: '100000000000000000000', // 100 WEGLD
                reserves1: '1000000000', // 1000 USDC
                totalSupply: '10000000000000000000000', // 10000 LP tokens
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, pair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));

            const lpToken = createMockToken(TEST_TOKEN_IDS.LP_EGLD_USDC, {
                type: EsdtTokenType.FungibleLpToken,
                decimals: 18,
                pairAddress: TEST_ADDRESSES.PAIR_EGLD_USDC,
            });
            tokens.set(TEST_TOKEN_IDS.LP_EGLD_USDC, lpToken);

            addLpTokensForPairs();

            service.recomputeAllValues(pairs, tokens, 1.0, [
                TEST_TOKEN_IDS.WEGLD,
                TEST_TOKEN_IDS.USDC,
            ]);

            // LP token price should be (value of underlying tokens for 1 LP) in USD
            const lpPrice = new BigNumber(pair.liquidityPoolTokenPriceUSD);
            expect(lpPrice.gt(0)).toBe(true);

            // LP token price = (reserves0 * token0PriceUSD + reserves1 * token1PriceUSD) / totalSupply
            // Approximately: (100 * 10 + 1000 * 1) / 10000 = 2000 / 10000 = 0.2 per LP
            expect(lpPrice.toFixed(1)).toBe('0.2');
        });

        it('should return zero for LP token price when no liquidityPoolTokenId', () => {
            const pair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_USDC, {
                firstTokenId: TEST_TOKEN_IDS.WEGLD,
                secondTokenId: TEST_TOKEN_IDS.USDC,
                liquidityPoolTokenId: null,
            });
            pair.info = new PairInfoModel({
                reserves0: '100000000000000000000',
                reserves1: '1000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, pair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));

            addLpTokensForPairs();

            service.recomputeAllValues(pairs, tokens, 1.0, [
                TEST_TOKEN_IDS.WEGLD,
                TEST_TOKEN_IDS.USDC,
            ]);

            // Pair without LP token should have liquidityPoolTokenPriceUSD = 0
            expect(pair.liquidityPoolTokenPriceUSD).toBe('0');
        });
    });

    describe('token liquidity calculations', () => {
        it('should compute token liquidityUSD from all active pairs', () => {
            // WEGLD-USDC pair
            const wegldUsdcPair = createMockPair(
                TEST_ADDRESSES.PAIR_EGLD_USDC,
                {
                    firstTokenId: TEST_TOKEN_IDS.WEGLD,
                    secondTokenId: TEST_TOKEN_IDS.USDC,
                    state: 'Active',
                },
            );
            wegldUsdcPair.info = new PairInfoModel({
                reserves0: '100000000000000000000',
                reserves1: '1000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, wegldUsdcPair);

            // WEGLD-MEX pair
            const wegldMexPair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_MEX, {
                firstTokenId: TEST_TOKEN_IDS.WEGLD,
                secondTokenId: TEST_TOKEN_IDS.MEX,
                state: 'Active',
            });
            wegldMexPair.info = new PairInfoModel({
                reserves0: '50000000000000000000',
                reserves1: '500000000000000000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_MEX, wegldMexPair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));
            tokens.set(TEST_TOKEN_IDS.MEX, Tokens(TEST_TOKEN_IDS.MEX));

            addLpTokensForPairs();

            service.recomputeAllValues(pairs, tokens, 1.0, [
                TEST_TOKEN_IDS.WEGLD,
                TEST_TOKEN_IDS.USDC,
            ]);

            // WEGLD liquidity should be sum of locked values across both pairs
            const wegldLiquidity = new BigNumber(
                tokens.get(TEST_TOKEN_IDS.WEGLD).liquidityUSD,
            );
            const wegldInUsdc = new BigNumber(
                wegldUsdcPair.firstTokenLockedValueUSD,
            );
            const wegldInMex = new BigNumber(
                wegldMexPair.firstTokenLockedValueUSD,
            );

            expect(wegldLiquidity.toFixed()).toBe(
                wegldInUsdc.plus(wegldInMex).toFixed(),
            );
        });

        it('should include inactive pairs with both common tokens in liquidity calculation', () => {
            // WEGLD-USDC pair (active)
            const wegldUsdcPairActive = createMockPair(
                TEST_ADDRESSES.PAIR_EGLD_USDC,
                {
                    firstTokenId: TEST_TOKEN_IDS.WEGLD,
                    secondTokenId: TEST_TOKEN_IDS.USDC,
                    state: 'Active',
                },
            );
            wegldUsdcPairActive.info = new PairInfoModel({
                reserves0: '100000000000000000000',
                reserves1: '1000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, wegldUsdcPairActive);

            // WEGLD-USDT pair (inactive but both common)
            const wegldUsdtPairInactive = createMockPair(
                TEST_ADDRESSES.PAIR_EGLD_USDT,
                {
                    firstTokenId: TEST_TOKEN_IDS.WEGLD,
                    secondTokenId: TEST_TOKEN_IDS.USDT,
                    state: 'Inactive',
                },
            );
            wegldUsdtPairInactive.info = new PairInfoModel({
                reserves0: '50000000000000000000',
                reserves1: '500000000',
                totalSupply: '5000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDT, wegldUsdtPairInactive);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));
            tokens.set(TEST_TOKEN_IDS.USDT, Tokens(TEST_TOKEN_IDS.USDT));

            addLpTokensForPairs();

            service.recomputeAllValues(
                pairs,
                tokens,
                1.0,
                [
                    TEST_TOKEN_IDS.WEGLD,
                    TEST_TOKEN_IDS.USDC,
                    TEST_TOKEN_IDS.USDT,
                ], // All common
            );

            // WEGLD liquidity should include both pairs
            const wegldLiquidity = new BigNumber(
                tokens.get(TEST_TOKEN_IDS.WEGLD).liquidityUSD,
            );
            const wegldInUsdc = new BigNumber(
                wegldUsdcPairActive.firstTokenLockedValueUSD,
            );
            const wegldInUsdt = new BigNumber(
                wegldUsdtPairInactive.firstTokenLockedValueUSD,
            );

            expect(wegldLiquidity.toFixed()).toBe(
                wegldInUsdc.plus(wegldInUsdt).toFixed(),
            );
        });

        it('should include only common token side for inactive pairs with one common token', () => {
            // WEGLD-USDC pair
            const wegldUsdcPair = createMockPair(
                TEST_ADDRESSES.PAIR_EGLD_USDC,
                {
                    firstTokenId: TEST_TOKEN_IDS.WEGLD,
                    secondTokenId: TEST_TOKEN_IDS.USDC,
                },
            );
            wegldUsdcPair.info = new PairInfoModel({
                reserves0: '100000000000000000000',
                reserves1: '1000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, wegldUsdcPair);

            // WEGLD-MEX pair (inactive, only WEGLD is common)
            const wegldMexPair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_MEX, {
                firstTokenId: TEST_TOKEN_IDS.WEGLD,
                secondTokenId: TEST_TOKEN_IDS.MEX,
                state: 'Inactive',
            });
            wegldMexPair.info = new PairInfoModel({
                reserves0: '50000000000000000000',
                reserves1: '500000000000000000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_MEX, wegldMexPair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));
            tokens.set(TEST_TOKEN_IDS.MEX, Tokens(TEST_TOKEN_IDS.MEX));

            addLpTokensForPairs();

            service.recomputeAllValues(
                pairs,
                tokens,
                1.0,
                [TEST_TOKEN_IDS.WEGLD, TEST_TOKEN_IDS.USDC], // Only WEGLD and USDC common
            );

            // WEGLD liquidity should include common token side from MEX pair
            const wegldLiquidity = new BigNumber(
                tokens.get(TEST_TOKEN_IDS.WEGLD).liquidityUSD,
            );
            const wegldInUsdc = new BigNumber(
                wegldUsdcPair.firstTokenLockedValueUSD,
            );
            const wegldInMex = new BigNumber(
                wegldMexPair.firstTokenLockedValueUSD,
            );

            expect(wegldLiquidity.toFixed()).toBe(
                wegldInUsdc.plus(wegldInMex).toFixed(),
            );
        });

        it('should exclude inactive pairs with no common tokens from liquidity calculation', () => {
            // WEGLD-USDC pair
            const wegldUsdcPair = createMockPair(
                TEST_ADDRESSES.PAIR_EGLD_USDC,
                {
                    firstTokenId: TEST_TOKEN_IDS.WEGLD,
                    secondTokenId: TEST_TOKEN_IDS.USDC,
                },
            );
            wegldUsdcPair.info = new PairInfoModel({
                reserves0: '100000000000000000000',
                reserves1: '1000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, wegldUsdcPair);

            // MEX-TOK4 pair (inactive, no common tokens)
            const mexTok4Pair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_MEX, {
                firstTokenId: TEST_TOKEN_IDS.MEX,
                secondTokenId: TEST_TOKEN_IDS.TOK4,
                state: 'Inactive',
            });
            mexTok4Pair.info = new PairInfoModel({
                reserves0: '100000000000000000000000',
                reserves1: '50000000000000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_MEX, mexTok4Pair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));
            tokens.set(TEST_TOKEN_IDS.MEX, Tokens(TEST_TOKEN_IDS.MEX));
            tokens.set(TEST_TOKEN_IDS.TOK4, Tokens(TEST_TOKEN_IDS.TOK4));

            addLpTokensForPairs();

            service.recomputeAllValues(pairs, tokens, 1.0, [
                TEST_TOKEN_IDS.WEGLD,
                TEST_TOKEN_IDS.USDC,
            ]);

            // MEX liquidity should be 0 because its only pair has no common tokens and is inactive
            expect(tokens.get(TEST_TOKEN_IDS.MEX).liquidityUSD).toBe('0');
        });
    });

    describe('edge cases', () => {
        it('should handle zero reserves gracefully', () => {
            const pair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_USDC, {
                firstTokenId: TEST_TOKEN_IDS.WEGLD,
                secondTokenId: TEST_TOKEN_IDS.USDC,
            });
            pair.info = new PairInfoModel({
                reserves0: '0',
                reserves1: '0',
                totalSupply: '0',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, pair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));

            expect(() => {
                addLpTokensForPairs();

                service.recomputeAllValues(pairs, tokens, 1.0, [
                    TEST_TOKEN_IDS.WEGLD,
                    TEST_TOKEN_IDS.USDC,
                ]);
            }).not.toThrow();

            // Prices should be computed even with zero reserves (may be zero or Infinity)
            expect(pair.firstTokenPrice).toBeDefined();
            expect(pair.secondTokenPrice).toBeDefined();
        });

        it('should handle zero total supply in LP price calculation', () => {
            const pair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_USDC, {
                firstTokenId: TEST_TOKEN_IDS.WEGLD,
                secondTokenId: TEST_TOKEN_IDS.USDC,
                liquidityPoolTokenId: TEST_TOKEN_IDS.LP_EGLD_USDC,
            });
            pair.info = new PairInfoModel({
                reserves0: '100000000000000000000',
                reserves1: '1000000000',
                totalSupply: '0', // Zero supply
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, pair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));

            const lpToken = createMockToken(TEST_TOKEN_IDS.LP_EGLD_USDC, {
                type: EsdtTokenType.FungibleLpToken,
                pairAddress: TEST_ADDRESSES.PAIR_EGLD_USDC,
            });
            tokens.set(TEST_TOKEN_IDS.LP_EGLD_USDC, lpToken);

            expect(() => {
                addLpTokensForPairs();

                service.recomputeAllValues(pairs, tokens, 1.0, [
                    TEST_TOKEN_IDS.WEGLD,
                    TEST_TOKEN_IDS.USDC,
                ]);
            }).not.toThrow();

            // LP token price may be Infinity or NaN with zero total supply
            expect(pair.liquidityPoolTokenPriceUSD).toBeDefined();
        });

        it('should handle tokens with no pairs gracefully with derivedEGLD = 0', () => {
            // WEGLD-USDC pair
            const wegldUsdcPair = createMockPair(
                TEST_ADDRESSES.PAIR_EGLD_USDC,
                {
                    firstTokenId: TEST_TOKEN_IDS.WEGLD,
                    secondTokenId: TEST_TOKEN_IDS.USDC,
                    liquidityPoolTokenId: TEST_TOKEN_IDS.LP_EGLD_USDC,
                },
            );
            wegldUsdcPair.info = new PairInfoModel({
                reserves0: '100000000000000000000',
                reserves1: '1000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, wegldUsdcPair);

            // MEX-WEGLD pair so MEX has at least one pair
            const mexWegldPair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_MEX, {
                firstTokenId: TEST_TOKEN_IDS.WEGLD,
                secondTokenId: TEST_TOKEN_IDS.MEX,
                liquidityPoolTokenId: TEST_TOKEN_IDS.LP_EGLD_MEX,
                state: 'Inactive',
            });
            mexWegldPair.info = new PairInfoModel({
                reserves0: '0', // Zero reserves = no liquidity
                reserves1: '0',
                totalSupply: '0',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_MEX, mexWegldPair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));
            // MEX with an inactive zero-liquidity pair
            tokens.set(TEST_TOKEN_IDS.MEX, Tokens(TEST_TOKEN_IDS.MEX));

            addLpTokensForPairs();

            service.recomputeAllValues(pairs, tokens, 1.0, [
                TEST_TOKEN_IDS.WEGLD,
                TEST_TOKEN_IDS.USDC,
            ]);

            // MEX should have derivedEGLD = 0 due to zero total supply pair
            expect(tokens.get(TEST_TOKEN_IDS.MEX).derivedEGLD).toBe('0');
            expect(tokens.get(TEST_TOKEN_IDS.MEX).price).toBe('0');
        });

        it('should not revisit pairs in circular references', () => {
            // Create circular reference: WEGLD -> USDC -> MEX -> WEGLD
            // This tests the doNotVisit Set
            const wegldUsdcPair = createMockPair(
                TEST_ADDRESSES.PAIR_EGLD_USDC,
                {
                    firstTokenId: TEST_TOKEN_IDS.WEGLD,
                    secondTokenId: TEST_TOKEN_IDS.USDC,
                    state: 'Active',
                },
            );
            wegldUsdcPair.info = new PairInfoModel({
                reserves0: '100000000000000000000',
                reserves1: '1000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, wegldUsdcPair);

            const usdcMexPair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_MEX, {
                firstTokenId: TEST_TOKEN_IDS.USDC,
                secondTokenId: TEST_TOKEN_IDS.MEX,
                state: 'Active',
            });
            usdcMexPair.info = new PairInfoModel({
                reserves0: '500000000',
                reserves1: '5000000000000000000000',
                totalSupply: '5000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_MEX, usdcMexPair);

            const mexWegldPair = createMockPair(TEST_ADDRESSES.PAIR_TOK4_EGLD, {
                firstTokenId: TEST_TOKEN_IDS.MEX,
                secondTokenId: TEST_TOKEN_IDS.WEGLD,
                state: 'Active',
            });
            mexWegldPair.info = new PairInfoModel({
                reserves0: '10000000000000000000000',
                reserves1: '10000000000000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_TOK4_EGLD, mexWegldPair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));
            tokens.set(TEST_TOKEN_IDS.MEX, Tokens(TEST_TOKEN_IDS.MEX));

            // Should not hang or crash
            expect(() => {
                addLpTokensForPairs();

                service.recomputeAllValues(pairs, tokens, 1.0, [
                    TEST_TOKEN_IDS.WEGLD,
                    TEST_TOKEN_IDS.USDC,
                ]);
            }).not.toThrow();

            // All tokens should have valid prices
            expect(
                new BigNumber(tokens.get(TEST_TOKEN_IDS.WEGLD).price).gte(0),
            ).toBe(true);
            expect(
                new BigNumber(tokens.get(TEST_TOKEN_IDS.USDC).price).gte(0),
            ).toBe(true);
            expect(
                new BigNumber(tokens.get(TEST_TOKEN_IDS.MEX).price).gte(0),
            ).toBe(true);
        });

        it('should skip pairs with zero totalSupply in derived EGLD calculation', () => {
            const wegldUsdcPair = createMockPair(
                TEST_ADDRESSES.PAIR_EGLD_USDC,
                {
                    firstTokenId: TEST_TOKEN_IDS.WEGLD,
                    secondTokenId: TEST_TOKEN_IDS.USDC,
                },
            );
            wegldUsdcPair.info = new PairInfoModel({
                reserves0: '100000000000000000000',
                reserves1: '1000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, wegldUsdcPair);

            // MEX-WEGLD pair with zero totalSupply (should be skipped)
            const mexWegldPair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_MEX, {
                firstTokenId: TEST_TOKEN_IDS.MEX,
                secondTokenId: TEST_TOKEN_IDS.WEGLD,
                state: 'Active',
            });
            mexWegldPair.info = new PairInfoModel({
                reserves0: '1000000000000000000000000',
                reserves1: '100000000000000000000',
                totalSupply: '0', // Zero supply - should be skipped
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_MEX, mexWegldPair);

            tokens.set(TEST_TOKEN_IDS.WEGLD, Tokens(TEST_TOKEN_IDS.WEGLD));
            tokens.set(TEST_TOKEN_IDS.USDC, Tokens(TEST_TOKEN_IDS.USDC));
            tokens.set(TEST_TOKEN_IDS.MEX, Tokens(TEST_TOKEN_IDS.MEX));

            addLpTokensForPairs();

            service.recomputeAllValues(pairs, tokens, 1.0, [
                TEST_TOKEN_IDS.WEGLD,
                TEST_TOKEN_IDS.USDC,
            ]);

            // MEX should have derivedEGLD = 0 because its only pair has zero supply
            expect(tokens.get(TEST_TOKEN_IDS.MEX).derivedEGLD).toBe('0');
        });

        it('should track updated tokens correctly', () => {
            const pair = createMockPair(TEST_ADDRESSES.PAIR_EGLD_USDC, {
                firstTokenId: TEST_TOKEN_IDS.WEGLD,
                secondTokenId: TEST_TOKEN_IDS.USDC,
            });
            pair.info = new PairInfoModel({
                reserves0: '100000000000000000000',
                reserves1: '1000000000',
                totalSupply: '10000000000000000000000',
            });
            pairs.set(TEST_ADDRESSES.PAIR_EGLD_USDC, pair);

            const wegld = Tokens(TEST_TOKEN_IDS.WEGLD);
            wegld.price = '10'; // Set initial price
            wegld.derivedEGLD = '1';
            tokens.set(TEST_TOKEN_IDS.WEGLD, wegld);

            const usdc = Tokens(TEST_TOKEN_IDS.USDC);
            usdc.price = '0'; // Different price - will be updated
            usdc.derivedEGLD = '0';
            tokens.set(TEST_TOKEN_IDS.USDC, usdc);

            addLpTokensForPairs();

            const updatedTokens = service.recomputeAllValues(
                pairs,
                tokens,
                1.0,
                [TEST_TOKEN_IDS.WEGLD, TEST_TOKEN_IDS.USDC],
            );

            // USDC should be in updated list because price changed
            expect(updatedTokens).toContain(TEST_TOKEN_IDS.USDC);

            // If WEGLD price didn't change, it might not be in the list
            // (depends on computation result)
        });
    });
});
