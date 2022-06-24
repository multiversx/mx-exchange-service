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
import { PairModel } from 'src/modules/pair/models/pair.model';

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

    it('should get all pairs', async () => {
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
            new PairModel({
                address:
                    'erd1e6w95arcwe3mph66cvvarr9hgdzzg7ljujw95rrefhunl0d4rr6qzd0g2g',
            }),
            new PairModel({
                address:
                    'erd1ak7v7n3qxg0uduuvmqx63308k3ksf50cw85jl3w6rad5jj7cmu9sn7c40x',
            }),
            new PairModel({
                address:
                    'erd1h26nrm7flz24mfruqajr4e6esfesup6hjpl6r4zav9cn0wec0fcs842lcw',
            }),
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
});
