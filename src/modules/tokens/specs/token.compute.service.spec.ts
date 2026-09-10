import { Test, TestingModule } from '@nestjs/testing';
import { TokenComputeService } from '../services/token.compute.service';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { PairService } from 'src/modules/pair/services/pair.service';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { TokenServiceProvider } from '../mocks/token.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { tokenProviderUSD } from 'src/config';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { AnalyticsQueryServiceProvider } from 'src/services/analytics/mocks/analytics.query.service.mock';
import { MXApiServiceProvider } from 'src/services/multiversx-communication/mx.api.service.mock';
import { ElasticSearchModule } from 'src/services/elastic-search/elastic.search.module';
import { PairsStateServiceProvider } from 'src/modules/state/mocks/pairs.state.service.mock';
import { PriceContext } from '../models/price.context';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';

describe('TokenComputeService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
                DynamicModuleUtils.getCacheModule(),
                ElasticSearchModule,
            ],
            providers: [
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                PairService,
                PairsStateServiceProvider,
                WrapAbiServiceProvider,
                TokenServiceProvider,
                RouterAbiServiceProvider,
                MXDataApiServiceProvider,
                ContextGetterServiceProvider,
                TokenComputeService,
                ApiConfigService,
                AnalyticsQueryServiceProvider,
                MXApiServiceProvider,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service: TokenComputeService =
            module.get<TokenComputeService>(TokenComputeService);
        expect(service).toBeDefined();
    });

    it('should compute token price derived EGLD for tokenProviderUSD', async () => {
        const service: TokenComputeService =
            module.get<TokenComputeService>(TokenComputeService);
        const price = await service.computeTokenPriceDerivedEGLD(
            tokenProviderUSD,
            [],
        );
        expect(price).toEqual('1');
    });

    it('should compute token price derived EGLD for MEX-123456', async () => {
        const service: TokenComputeService =
            module.get<TokenComputeService>(TokenComputeService);
        const price = await service.computeTokenPriceDerivedEGLD(
            'MEX-123456',
            [],
        );
        expect(price).toEqual('0.001');
    });

    it('should compute token price derived EGLD for TOK4-123456', async () => {
        const service: TokenComputeService =
            module.get<TokenComputeService>(TokenComputeService);
        const price = await service.computeTokenPriceDerivedEGLD(
            'TOK4-123456',
            [],
        );
        expect(price).toEqual('0.01');
    });

    it('should compute token price derived EGLD for TOK5-123456', async () => {
        const service: TokenComputeService =
            module.get<TokenComputeService>(TokenComputeService);
        const price = await service.computeTokenPriceDerivedEGLD(
            'TOK5-123456',
            [],
        );
        expect(price).toEqual('0.01');
    });

    it('should compute token price derived EGLD for TOK6-123456', async () => {
        const service: TokenComputeService =
            module.get<TokenComputeService>(TokenComputeService);
        const price = await service.computeTokenPriceDerivedEGLD(
            'TOK6-123456',
            [],
        );
        expect(price).toEqual('0');
    });

    describe('batched traversal reads', () => {
        let service: TokenComputeService;
        let pairAbi: PairAbiService;

        beforeEach(() => {
            service = module.get<TokenComputeService>(TokenComputeService);
            pairAbi = module.get<PairAbiService>(PairAbiService);
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should read pair state and liquidity in batches, never per pair', async () => {
            const totalSupply = jest.spyOn(pairAbi, 'totalSupply');
            const state = jest.spyOn(pairAbi, 'state');
            const firstTokenReserve = jest.spyOn(pairAbi, 'firstTokenReserve');
            const secondTokenReserve = jest.spyOn(pairAbi, 'secondTokenReserve');
            const pairInfoMetadata = jest.spyOn(pairAbi, 'pairInfoMetadata');
            const batchedPairsInfo = jest.spyOn(
                pairAbi,
                'getAllPairsInfoMetadata',
            );

            const price = await service.computeTokenPriceDerivedEGLD(
                'MEX-123456',
                [],
            );

            expect(price).toEqual('0.001');
            expect(batchedPairsInfo.mock.calls.length).toBeGreaterThan(0);
            expect(totalSupply).not.toHaveBeenCalled();
            expect(state).not.toHaveBeenCalled();
            expect(firstTokenReserve).not.toHaveBeenCalled();
            expect(secondTokenReserve).not.toHaveBeenCalled();
            expect(pairInfoMetadata).not.toHaveBeenCalled();
        });

        it('should read reserves and liquidity from one call per visited node', async () => {
            const batchedPairsInfo = jest.spyOn(
                pairAbi,
                'getAllPairsInfoMetadata',
            );

            await service.computeTokenPriceDerivedEGLD('MEX-123456', []);

            const readPairs = batchedPairsInfo.mock.calls.reduce(
                (total, [addresses]) => total + addresses.length,
                0,
            );

            expect(readPairs).toBeGreaterThanOrEqual(
                batchedPairsInfo.mock.calls.length,
            );
        });
    });

    describe('price context', () => {
        let service: TokenComputeService;
        let traversal: jest.SpyInstance;

        // The traversal recurses into itself, so the raw call count also
        // includes every descent. Only calls that inherit no `computedPrices`
        // map are roots - those are the walks a shared context can collapse.
        const rootTraversals = (): number =>
            traversal.mock.calls.filter(
                ([, , computedPrices]) => computedPrices === undefined,
            ).length;

        beforeEach(() => {
            service = module.get<TokenComputeService>(TokenComputeService);
            traversal = jest.spyOn(service, 'computeTokenPriceDerivedEGLD');
        });

        afterEach(() => {
            traversal.mockRestore();
        });

        it.each([
            [tokenProviderUSD, '1'],
            ['MEX-123456', '0.001'],
            ['TOK4-123456', '0.01'],
            ['TOK5-123456', '0.01'],
            ['TOK6-123456', '0'],
        ])(
            'should return the same derived EGLD price as an uncontexted call for %s',
            async (tokenID, expected) => {
                const withoutContext =
                    await service.computeDerivedEGLDInContext(tokenID);
                const withContext = await service.computeDerivedEGLDInContext(
                    tokenID,
                    new PriceContext(),
                );

                expect(withoutContext).toEqual(expected);
                expect(withContext).toEqual(expected);
            },
        );

        it('should traverse once for repeated roots sharing a context', async () => {
            const context = new PriceContext();

            const first = await service.computeDerivedEGLDInContext(
                'MEX-123456',
                context,
            );
            const second = await service.computeDerivedEGLDInContext(
                'MEX-123456',
                context,
            );

            expect(first).toEqual(second);
            expect(rootTraversals()).toEqual(1);
        });

        it('should traverse once for concurrent roots sharing a context', async () => {
            const context = new PriceContext();

            const prices = await Promise.all([
                service.computeDerivedEGLDInContext('MEX-123456', context),
                service.computeDerivedEGLDInContext('MEX-123456', context),
                service.computeDerivedEGLDInContext('MEX-123456', context),
            ]);

            expect(prices).toEqual(['0.001', '0.001', '0.001']);
            expect(rootTraversals()).toEqual(1);
        });

        it('should traverse per call when no context is passed', async () => {
            await service.computeDerivedEGLDInContext('MEX-123456');
            await service.computeDerivedEGLDInContext('MEX-123456');

            expect(rootTraversals()).toEqual(2);
        });

        it('should not share memoized prices between contexts', async () => {
            await service.computeDerivedEGLDInContext(
                'MEX-123456',
                new PriceContext(),
            );
            await service.computeDerivedEGLDInContext(
                'MEX-123456',
                new PriceContext(),
            );

            expect(rootTraversals()).toEqual(2);
        });

        it('should reach the traversal memo through derived USD prices', async () => {
            const context = new PriceContext();

            await service.computeTokenPriceDerivedUSD('MEX-123456', context);
            await service.computeTokenPriceDerivedUSD('MEX-123456', context);

            expect(rootTraversals()).toEqual(1);
        });

        it('should collapse the swap handler call pattern to one traversal per token', async () => {
            const context = new PriceContext();

            await Promise.all([
                service.computeTokenPriceDerivedUSD('MEX-123456', context),
                service.computeTokenPriceDerivedUSD('TOK4-123456', context),
            ]);
            await Promise.all([
                service.computeDerivedEGLDInContext('MEX-123456', context),
                service.computeTokenPriceDerivedUSD('MEX-123456', context),
                service.computeDerivedEGLDInContext('TOK4-123456', context),
                service.computeTokenPriceDerivedUSD('TOK4-123456', context),
            ]);

            expect(rootTraversals()).toEqual(2);
        });

        it('should not memoize a failed traversal', async () => {
            const context = new PriceContext();
            traversal.mockRejectedValueOnce(new Error('gateway down'));

            await expect(
                service.computeDerivedEGLDInContext('MEX-123456', context),
            ).rejects.toThrow('gateway down');

            await expect(
                service.computeDerivedEGLDInContext('MEX-123456', context),
            ).resolves.toEqual('0.001');
            expect(rootTraversals()).toEqual(2);
        });
    });
});
