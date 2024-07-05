import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { MXApiServiceProvider } from '../../../services/multiversx-communication/mx.api.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
import { FarmComputeServiceV1_2 } from '../v1.2/services/farm.v1.2.compute.service';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { FarmAbiServiceProviderV1_2 } from '../mocks/farm.v1.2.abi.service.mock';
import { FarmServiceV1_2 } from '../v1.2/services/farm.v1.2.service';
import { Address } from '@multiversx/sdk-core/out';
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
                FarmAbiServiceProviderV1_2,
                FarmServiceV1_2,
                FarmComputeServiceV1_2,
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
                AnalyticsQueryServiceProvider,
                ApiConfigService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );

        expect(service).toBeDefined();
    });

    it('should compute farm locked value USD', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );

        const farmLockedValueUSD = await service.computeFarmLockedValueUSD(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000021',
            ).bech32(),
        );
        expect(farmLockedValueUSD).toEqual('30');
    });

    it('should compute locked farming token reserve', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );

        const lockedFarmingTokenReserve =
            await service.computeLockedFarmingTokenReserve(
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000021',
                ).bech32(),
            );
        expect(lockedFarmingTokenReserve).toEqual('500000000000000000');
    });

    it('should compute unlocked farming token reserve', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );

        const unlockedFarmingTokenReserve =
            await service.computeUnlockedFarmingTokenReserve(
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000021',
                ).bech32(),
            );
        expect(unlockedFarmingTokenReserve).toEqual('1000000000000000000');
    });

    it('should compute locked farming token reserve USD', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );

        const lockedFarmingTokenReserveUSD =
            await service.computeLockedFarmingTokenReserveUSD(
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000021',
                ).bech32(),
            );
        expect(lockedFarmingTokenReserveUSD).toEqual('10');
    });

    it('should compute unlocked farming token reserve USD', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );

        const unlockedFarmingTokenReserveUSD =
            await service.computeUnlockedFarmingTokenReserveUSD(
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000021',
                ).bech32(),
            );
        expect(unlockedFarmingTokenReserveUSD).toEqual('20');
    });

    it('should compute virtual value locked USD', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );

        const virtualValueLockedUSD =
            await service.computeVirtualValueLockedUSD(
                Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000021',
                ).bech32(),
            );
        expect(virtualValueLockedUSD).toEqual('40');
    });

    it('should compute unlocked rewards APR', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );

        const unlockedRewardsAPR = await service.computeUnlockedRewardsAPR(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000021',
            ).bech32(),
        );
        expect(unlockedRewardsAPR).toEqual('1324');
    });

    it('should compute locked rewards APR', async () => {
        const service = module.get<FarmComputeServiceV1_2>(
            FarmComputeServiceV1_2,
        );

        const lockedRewardsAPR = await service.computeLockedRewardsAPR(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000021',
            ).bech32(),
        );
        expect(lockedRewardsAPR).toEqual('2638');
    });
});
