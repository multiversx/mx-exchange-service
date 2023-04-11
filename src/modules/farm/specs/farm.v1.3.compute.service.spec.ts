import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { MXApiService } from '../../../services/multiversx-communication/mx.api.service';
import { MXApiServiceMock } from '../../../services/multiversx-communication/mx.api.service.mock';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { PairGetterService } from '../../../modules/pair/services/pair.getter.service';
import { PairGetterServiceStub } from '../../../modules/pair/mocks/pair-getter-service-stub.service';
import { PairComputeService } from '../../../modules/pair/services/pair.compute.service';
import { ContextGetterService } from '../../../services/context/context.getter.service';
import { ContextGetterServiceMock } from '../../../services/context/mocks/context.getter.service.mock';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { RouterGetterServiceProvider } from 'src/modules/router/mocks/router.getter.service.stub';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { AbiFarmServiceProvider } from '../mocks/abi.farm.service.mock';
import { FarmComputeServiceV1_3 } from '../v1.3/services/farm.v1.3.compute.service';
import { FarmGetterServiceProviderV1_3 } from '../mocks/farm.v1.3.getter.service.mock';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';

describe('FarmService', () => {
    let service: FarmComputeServiceV1_3;

    const MXApiServiceProvider = {
        provide: MXApiService,
        useClass: MXApiServiceMock,
    };

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceStub,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                AbiFarmServiceProvider,
                FarmGetterServiceProviderV1_3,
                FarmComputeServiceV1_3,
                MXApiServiceProvider,
                ContextGetterServiceProvider,
                PairService,
                PairGetterServiceProvider,
                PairComputeService,
                TokenGetterServiceProvider,
                TokenComputeService,
                RouterGetterServiceProvider,
                WrapAbiServiceProvider,
                MXDataApiServiceProvider,
            ],
        }).compile();

        service = module.get<FarmComputeServiceV1_3>(FarmComputeServiceV1_3);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should compute farm APR', async () => {
        const farmAPR = await service.computeFarmAPR('farm_address_2');
        expect(farmAPR).toEqual('10.05256');
    });
});
