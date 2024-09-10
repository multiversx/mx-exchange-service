import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { MXApiServiceProvider } from '../../../services/multiversx-communication/mx.api.service.mock';
import { ContextGetterServiceProvider } from '../../../services/context/mocks/context.getter.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
import { FarmComputeServiceV1_2 } from '../v1.2/services/farm.v1.2.compute.service';
import { CalculateRewardsArgs } from '../models/farm.args';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { FarmAbiServiceProviderV1_2 } from '../mocks/farm.v1.2.abi.service.mock';
import { FarmServiceV1_2 } from '../v1.2/services/farm.v1.2.service';
import { Address } from '@multiversx/sdk-core/out';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import winston from 'winston';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { AnalyticsQueryServiceProvider } from 'src/services/analytics/mocks/analytics.query.service.mock';
import { ElasticSearchModule } from 'src/services/elastic-search/elastic.search.module';

describe('FarmService', () => {
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
                MXApiServiceProvider,
                ContextGetterServiceProvider,
                PairService,
                PairAbiServiceProvider,
                PairComputeServiceProvider,
                TokenServiceProvider,
                TokenComputeService,
                RouterAbiServiceProvider,
                WrapAbiServiceProvider,
                MXDataApiServiceProvider,
                FarmComputeServiceV1_2,
                FarmAbiServiceProviderV1_2,
                FarmServiceV1_2,
                ApiConfigService,
                AnalyticsQueryServiceProvider,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );
        expect(service).toBeDefined();
    });

    it('should compute farmed token price USD', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );
        const farmedTokenPriceUSD = await service.farmedTokenPriceUSD(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000021',
            ).bech32(),
        );
        expect(farmedTokenPriceUSD).toEqual('0.01');
    });

    it('should compute farming token price USD', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );
        const farmingTokenPriceUSD = await service.computeFarmingTokenPriceUSD(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000021',
            ).bech32(),
        );
        expect(farmingTokenPriceUSD).toEqual('20');
    });

    it('should compute farm rewards for position', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );
        const contextGetter =
            module.get<ContextGetterService>(ContextGetterService);
        jest.spyOn(
            contextGetter,
            'getShardCurrentBlockNonce',
        ).mockResolvedValue(2);

        const calculateRewardsArgs = new CalculateRewardsArgs();
        calculateRewardsArgs.farmAddress = Address.fromHex(
            '0000000000000000000000000000000000000000000000000000000000000021',
        ).bech32();
        calculateRewardsArgs.liquidity = '2000000000000000000';
        const farmRewardsForPosition =
            await service.computeFarmRewardsForPosition(
                calculateRewardsArgs,
                '0',
            );
        expect(farmRewardsForPosition.toFixed()).toEqual('1000000000000000000');
    });

    it('should compute anual rewards USD', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );
        const anualRewardsUSD = await service.computeAnualRewardsUSD(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000021',
            ).bech32(),
        );
        expect(anualRewardsUSD).toEqual('52560');
    });
});
