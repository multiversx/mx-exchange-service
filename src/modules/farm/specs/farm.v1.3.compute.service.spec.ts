import { Test, TestingModule } from '@nestjs/testing';
import { PairService } from '../../pair/services/pair.service';
import { FarmService } from '../services/farm.service';
import { ElrondApiService } from '../../../services/elrond-communication/elrond-api.service';
import { ElrondApiServiceMock } from '../../../services/elrond-communication/elrond.api.service.mock';
import { CommonAppModule } from '../../../common.app.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { PairGetterService } from '../../../modules/pair/services/pair.getter.service';
import { PairGetterServiceMock } from '../../../modules/pair/mocks/pair.getter.service.mock';
import { PairComputeService } from '../../../modules/pair/services/pair.compute.service';
import { ContextGetterService } from '../../../services/context/context.getter.service';
import { ContextGetterServiceMock } from '../../../services/context/mocks/context.getter.service.mock';
import { WrapService } from '../../wrapping/wrap.service';
import { WrapServiceMock } from '../../wrapping/wrap.test-mocks';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { RouterGetterServiceProvider } from 'src/modules/router/mocks/router.getter.service.mock';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { AbiFarmServiceProvider } from '../mocks/abi.farm.service.mock';
import { FarmV13ComputeService } from '../services/v1.3/farm.v1.3.compute.service';
import { FarmV13GetterServiceProvider } from '../mocks/farm.v1.3.getter.service.mock';

describe('FarmService', () => {
    let service: FarmV13ComputeService;

    const ElrondApiServiceProvider = {
        provide: ElrondApiService,
        useClass: ElrondApiServiceMock,
    };

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceMock,
    };

    const WrapServiceProvider = {
        provide: WrapService,
        useClass: WrapServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                AbiFarmServiceProvider,
                FarmV13GetterServiceProvider,
                FarmV13ComputeService,
                ElrondApiServiceProvider,
                ContextGetterServiceProvider,
                PairService,
                PairGetterServiceProvider,
                PairComputeService,
                TokenGetterServiceProvider,
                TokenComputeService,
                RouterGetterServiceProvider,
                WrapServiceProvider,
            ],
        }).compile();

        service = module.get<FarmV13ComputeService>(FarmV13ComputeService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should compute farm APR', async () => {
        const farmAPR = await service.computeFarmAPR('farm_address_2');
        expect(farmAPR).toEqual('10.05256');
    });
});
