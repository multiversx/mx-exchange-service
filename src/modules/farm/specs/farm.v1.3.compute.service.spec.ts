import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { MXApiServiceProvider } from '../../../services/multiversx-communication/mx.api.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
import { FarmComputeServiceV1_3 } from '../v1.3/services/farm.v1.3.compute.service';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { PairComputeServiceProvider } from 'src/modules/pair/mocks/pair.compute.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';
import { FarmAbiServiceProviderV1_3 } from '../mocks/farm.v1.3.abi.service.mock';
import { FarmServiceV1_3 } from '../v1.3/services/farm.v1.3.service';
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
                FarmAbiServiceProviderV1_3,
                FarmServiceV1_3,
                FarmComputeServiceV1_3,
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
        const service = module.get<FarmComputeServiceV1_3>(
            FarmComputeServiceV1_3,
        );

        expect(service).toBeDefined();
    });

    it('should compute farm APR', async () => {
        const service = module.get<FarmComputeServiceV1_3>(
            FarmComputeServiceV1_3,
        );

        const farmAPR = await service.computeFarmAPR(
            Address.fromHex(
                '0000000000000000000000000000000000000000000000000000000000000031',
            ).bech32(),
        );
        expect(farmAPR).toEqual('2638');
    });
});
