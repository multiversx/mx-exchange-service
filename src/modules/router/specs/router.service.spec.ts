import { Test, TestingModule } from '@nestjs/testing';
import { RouterService } from '../services/router.service';
import { PairFilterArgs } from '../models/filter.args';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { PairAbiServiceProvider } from 'src/modules/pair/mocks/pair.abi.service.mock';
import { RouterAbiServiceProvider } from '../mocks/router.abi.service.mock';
import { CachingModule } from 'src/services/caching/cache.module';

describe('RouterService', () => {
    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [CachingModule],
            providers: [
                PairAbiServiceProvider,
                RouterAbiServiceProvider,
                RouterService,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service = module.get<RouterService>(RouterService);
        expect(service).toBeDefined();
    });

    it('should get all pairs', async () => {
        const service = module.get<RouterService>(RouterService);

        const allPairs = await service.getAllPairs(
            0,
            Number.MAX_VALUE,
            new PairFilterArgs(),
        );
        expect(allPairs).toEqual([
            new PairModel({
                address:
                    'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            }),
            new PairModel({
                address:
                    'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
            }),
            new PairModel({
                address:
                    'erd1a42xw92g8n78v6y4p3qj9ed2gjmr20kd9h2pkhuuuxf5tgn44q3sxy8unx',
            }),
        ]);
    });

    it('should get filtered pairs', async () => {
        const service = module.get<RouterService>(RouterService);

        const filteredPairs = await service.getAllPairs(0, Number.MAX_VALUE, {
            firstTokenID: 'WEGLD-123456',
            issuedLpToken: true,
            address: null,
            secondTokenID: null,
            state: null,
        });
        expect(filteredPairs).toEqual([
            new PairModel({
                address:
                    'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            }),
            new PairModel({
                address:
                    'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
            }),
        ]);
    });
});
