import { Test, TestingModule } from '@nestjs/testing';
import { ContextService } from 'src/services/context/context.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { CommonAppModule } from 'src/common.app.module';
import { ContextServiceMock } from 'src/services/context/mocks/context.service.mock';
import { WrapServiceMock } from 'src/modules/wrapping/wrap.test-mocks';
import { PairGetterService } from '../services/pair.getter.service';
import { PairGetterServiceMock } from '../mocks/pair.getter.service.mock';
import { PairComputeService } from '../services/pair.compute.service';
import { PairService } from '../services/pair.service';
import { PairServiceMock } from '../mocks/pair.service.mock';
import { PriceFeedService } from 'src/services/price-feed/price-feed.service';
import { PriceFeedServiceMock } from 'src/services/price-feed/price.feed.service.mock';

describe('PairService', () => {
    let service: PairComputeService;

    const PairServiceProvider = {
        provide: PairService,
        useClass: PairServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceMock,
    };

    const ContextServiceProvider = {
        provide: ContextService,
        useClass: ContextServiceMock,
    };

    const WrapServiceProvider = {
        provide: WrapService,
        useClass: WrapServiceMock,
    };

    const PriceFeedProvider = {
        provide: PriceFeedService,
        useClass: PriceFeedServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule],
            providers: [
                PairComputeService,
                PairServiceProvider,
                PairGetterServiceProvider,
                ContextServiceProvider,
                WrapServiceProvider,
                PriceFeedProvider,
            ],
        }).compile();

        service = module.get<PairComputeService>(PairComputeService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get simple token price in USD', async () => {
        const tokenPriceUSD = await service.computeTokenPriceUSD('TOK1-1111');
        expect(tokenPriceUSD.toFixed()).toEqual('200');
    });

    it('should get token price in USD from simple path', async () => {
        const tokenPriceUSD = await service.computeTokenPriceUSD('TOK3-3333');
        expect(tokenPriceUSD.toFixed()).toEqual('100');
    });

    it('should get token price in USD from multiple path', async () => {
        const tokenPriceUSD = await service.computeTokenPriceUSD('TOK2-2222');
        expect(tokenPriceUSD.toFixed()).toEqual('100');
    });

    it('should get lpToken Price in USD from pair', async () => {
        const lpTokenPriceUSD = await service.computeLpTokenPriceUSD(
            'pair_address_1',
        );
        expect(lpTokenPriceUSD).toEqual('400');
    });
});
