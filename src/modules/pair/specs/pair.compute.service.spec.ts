import { Test, TestingModule } from '@nestjs/testing';
import { PairComputeService } from '../services/pair.compute.service';
import { PairService } from '../services/pair.service';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { PairAbiServiceProvider } from '../mocks/pair.abi.service.mock';
import { AnalyticsQueryServiceProvider } from 'src/services/analytics/mocks/analytics.query.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { Address } from '@multiversx/sdk-core/out';
import { PairsData } from '../mocks/pair.constants';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { CacheModule } from '@nestjs/cache-manager';
import { CachingService } from 'src/services/caching/cache.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';

describe('PairService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                CacheModule.register(),
                WinstonModule.forRoot({
                    transports: [new winston.transports.Console({})],
                }),
                ConfigModule.forRoot({}),
            ],
            providers: [
                PairComputeService,
                PairService,
                PairAbiServiceProvider,
                WrapAbiServiceProvider,
                TokenServiceProvider,
                RouterAbiServiceProvider,
                MXDataApiServiceProvider,
                TokenComputeService,
                AnalyticsQueryServiceProvider,
                ContextGetterServiceProvider,
                CachingService,
                ApiConfigService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<PairComputeService>(PairComputeService);

        expect(service).toBeDefined();
    });

    it('compute first token price', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const routerAbi = module.get<RouterAbiService>(RouterAbiService);
        const pairsAddress = await routerAbi.pairsAddress();

        for (const pairAddress of pairsAddress) {
            const tokenPrice = await service.computeFirstTokenPrice(
                pairAddress,
            );
            expect(tokenPrice).toEqual(PairsData(pairAddress).firstTokenPrice);
        }
    });

    it('compute second token price', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const pairAddress = Address.fromHex(
            '0000000000000000000000000000000000000000000000000000000000000013',
        ).bech32();
        const tokenPrice = await service.computeSecondTokenPrice(pairAddress);
        expect(tokenPrice).toEqual(PairsData(pairAddress).secondTokenPrice);
    });

    it('compute first token price USD', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const pairAddress = Address.fromHex(
            '0000000000000000000000000000000000000000000000000000000000000013',
        ).bech32();
        const tokenPriceUSD = await service.computeFirstTokenPriceUSD(
            pairAddress,
        );
        expect(tokenPriceUSD).toEqual(
            PairsData(pairAddress).firstTokenPriceUSD,
        );
    });

    it('compute second token price USD', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const pairAddress = Address.fromHex(
            '0000000000000000000000000000000000000000000000000000000000000013',
        ).bech32();
        const tokenPriceUSD = await service.computeSecondTokenPriceUSD(
            pairAddress,
        );
        expect(tokenPriceUSD).toEqual(
            PairsData(pairAddress).secondTokenPriceUSD,
        );
    });

    it('compute first token locked value USD', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const pairAddress = Address.fromHex(
            '0000000000000000000000000000000000000000000000000000000000000013',
        ).bech32();
        const tokenLockedValueUSD =
            await service.computeFirstTokenLockedValueUSD(pairAddress);
        expect(tokenLockedValueUSD.toFixed()).toEqual(
            PairsData(pairAddress).firstTokenLockedValueUSD,
        );
    });

    it('compute second token locked value USD', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const pairAddress = Address.fromHex(
            '0000000000000000000000000000000000000000000000000000000000000013',
        ).bech32();
        const tokenLockedValueUSD =
            await service.computeSecondTokenLockedValueUSD(pairAddress);
        expect(tokenLockedValueUSD.toFixed()).toEqual(
            PairsData(pairAddress).secondTokenLockedValueUSD,
        );
    });

    it('compute locked value USD', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const pairAddress = Address.fromHex(
            '0000000000000000000000000000000000000000000000000000000000000013',
        ).bech32();
        const tokenLockedValueUSD = await service.computeLockedValueUSD(
            pairAddress,
        );
        expect(tokenLockedValueUSD.toFixed()).toEqual(
            PairsData(pairAddress).lockedValueUSD,
        );
    });

    it('should get lpToken Price in USD from pair', async () => {
        const service = module.get<PairComputeService>(PairComputeService);

        let lpTokenPriceUSD = await service.computeLpTokenPriceUSD(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
        );
        expect(lpTokenPriceUSD).toEqual('20');

        lpTokenPriceUSD = await service.computeLpTokenPriceUSD(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000013',
            ).bech32(),
        );

        expect(lpTokenPriceUSD).toEqual('2000000000000');
    });

    it('should get pair type: Core', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const type = await service.computeTypeFromTokens(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000013',
            ).bech32(),
        );
        expect(type).toEqual('Core');
    });

    it('should get pair type: Ecosystem', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const type = await service.computeTypeFromTokens(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000012',
            ).bech32(),
        );
        expect(type).toEqual('Ecosystem');
    });
});
