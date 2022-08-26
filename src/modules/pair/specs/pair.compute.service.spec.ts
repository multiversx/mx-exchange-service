import { Test, TestingModule } from '@nestjs/testing';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { CommonAppModule } from 'src/common.app.module';
import { WrapServiceMock } from 'src/modules/wrapping/wrap.test-mocks';
import { PairGetterService } from '../services/pair.getter.service';
import { PairGetterServiceMock } from '../mocks/pair.getter.service.mock';
import { PairComputeService } from '../services/pair.compute.service';
import { PairService } from '../services/pair.service';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';
import { CachingModule } from 'src/services/caching/cache.module';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';

describe('PairService', () => {
    let service: PairComputeService;

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
                PairComputeService,
                PairService,
                PairGetterServiceProvider,
                WrapServiceProvider,
                TokenGetterServiceProvider,
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
        expect(lpTokenPriceUSD).toEqual('400');
    });
});
