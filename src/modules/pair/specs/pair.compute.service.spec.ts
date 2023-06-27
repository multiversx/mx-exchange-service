import { Test, TestingModule } from '@nestjs/testing';
import { CommonAppModule } from 'src/common.app.module';
import { PairComputeService } from '../services/pair.compute.service';
import { PairService } from '../services/pair.service';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { CachingModule } from 'src/services/caching/cache.module';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { MXDataApiServiceProvider } from 'src/services/multiversx-communication/mx.data.api.service.mock';
import { WrapAbiServiceProvider } from 'src/modules/wrapping/mocks/wrap.abi.service.mock';
import { PairAbiServiceProvider } from '../mocks/pair.abi.service.mock';
import { AnalyticsQueryServiceProvider } from 'src/services/analytics/mocks/analytics.query.service.mock';
import { ContextGetterServiceProvider } from 'src/services/context/mocks/context.getter.service.mock';
import { RouterAbiServiceProvider } from 'src/modules/router/mocks/router.abi.service.mock';

describe('PairService', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                PairComputeService,
                PairService,
                PairAbiServiceProvider,
                WrapAbiServiceProvider,
                TokenGetterServiceProvider,
                RouterAbiServiceProvider,
                MXDataApiServiceProvider,
                TokenComputeService,
                AnalyticsQueryServiceProvider,
                ContextGetterServiceProvider,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<PairComputeService>(PairComputeService);

        expect(service).toBeDefined();
    });

    it('should get lpToken Price in USD from pair', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const tokenCompute =
            module.get<TokenComputeService>(TokenComputeService);
        jest.spyOn(tokenCompute, 'getEgldPriceInUSD').mockReturnValue(
            Promise.resolve('20'),
        );

        const lpTokenPriceUSD = await service.computeLpTokenPriceUSD(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
        );
        expect(lpTokenPriceUSD).toEqual('40');
    });

    it('should get pair type: Core', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const type = await service.computeTypeFromTokens(
            'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
        );
        expect(type).toEqual('Core');
    });

    it('should get pair type: Ecosystem', async () => {
        const service = module.get<PairComputeService>(PairComputeService);
        const type = await service.computeTypeFromTokens(
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
        );
        expect(type).toEqual('Ecosystem');
    });
});
