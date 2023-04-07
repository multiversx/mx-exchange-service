import { Test, TestingModule } from '@nestjs/testing';
import { CommonAppModule } from 'src/common.app.module';
import { PairGetterService } from '../services/pair.getter.service';
import { PairGetterServiceStub } from '../mocks/pair-getter-service-stub.service';
import { PairComputeService } from '../services/pair.compute.service';
import { PairService } from '../services/pair.service';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { CachingModule } from 'src/services/caching/cache.module';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { RouterGetterServiceProvider } from 'src/modules/router/mocks/router.getter.service.stub';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';

describe('PairService', () => {
    let service: PairComputeService;

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceStub,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                PairComputeService,
                PairService,
                PairGetterServiceProvider,
                WrapAbiServiceProvider,
                TokenGetterServiceProvider,
                RouterGetterServiceProvider,
                MXDataApiServiceProvider,
                TokenComputeService,
            ],
        }).compile();

        service = module.get<PairComputeService>(PairComputeService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get lpToken Price in USD from pair', async () => {
        const lpTokenPriceUSD = await service.computeLpTokenPriceUSD(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
        );
        expect(lpTokenPriceUSD).toEqual('40');
    });
});
