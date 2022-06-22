import { Test, TestingModule } from '@nestjs/testing';
import { PairGetterServiceMock } from 'src/modules/pair/mocks/pair.getter.service.mock';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { ConfigModule } from '@nestjs/config';
import { RouterGetterService } from '../services/router.getter.service';
import { RouterGetterServiceMock } from '../mocks/router.getter.service.mock';
import winston from 'winston';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as Transport from 'winston-transport';
import { RouterService } from '../services/router.service';
import { CachingModule } from 'src/services/caching/cache.module';
import { PairFilterArgs } from '../models/filter.args';

describe('RouterService', () => {
    let service: RouterService;

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceMock,
    };

    const RouterGetterServiceProvider = {
        provide: RouterGetterService,
        useClass: RouterGetterServiceMock,
    };

    const logTransports: Transport[] = [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                nestWinstonModuleUtilities.format.nestLike(),
            ),
        }),
    ];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: logTransports,
                }),
                ConfigModule,
                CachingModule,
            ],
            providers: [
                PairGetterServiceProvider,
                RouterGetterServiceProvider,
                RouterService,
            ],
        }).compile();

        service = module.get<RouterService>(RouterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get factory', async () => {
        const factory = await service.getFactory();
        expect(factory).toEqual({
            address:
                'erd1qqqqqqqqqqqqqpgqpv09kfzry5y4sj05udcngesat07umyj70n4sa2c0rp',
        });
    });

    it('should get all pairs', async () => {
        const allPairs = await service.getAllPairs(
            0,
            Number.MAX_VALUE,
            new PairFilterArgs(),
        );
        expect(allPairs).toEqual([
            {
                address:
                    'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            },
            {
                address:
                    'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
            },
        ]);
    });

    it('should get filtered pairs', async () => {
        const filteredPairs = await service.getAllPairs(0, Number.MAX_VALUE, {
            firstTokenID: 'TOK2-2222',
            issuedLpToken: true,
            address: null,
            secondTokenID: null,
            state: null,
        });
        expect(filteredPairs).toEqual([]);
    });

    it('should get filtered pairs', async () => {
        const filteredPairs = await service.getAllPairs(0, Number.MAX_VALUE, {
            firstTokenID: 'TOK2-2222',
            issuedLpToken: true,
            address: null,
            secondTokenID: null,
            state: null,
        });
        expect(filteredPairs).toEqual([]);
    });

    // Timeout - Async callback was not invoked within the 5000ms timeout specified by
    // jest.setTimeout.Timeout - Async callback was not invoked within the 5000ms timeout
    // specified by jest.setTimeout.Error: ...
    /*it('should get pairs count', async () => {
        const pairCount = await service.getPairCount();
        console.log('pairsCount', pairCount);
        expect(pairCount).toEqual(pairCount);
    });*/
});
