import { Test, TestingModule } from '@nestjs/testing';
import { RedisModule } from 'nestjs-redis';
import { RedisCacheService } from '../../services/redis-cache.service';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';
import * as Transport from 'winston-transport';
import { ContextService } from '../../services/context/context.service';
import { PairService } from '../pair/pair.service';
import { FarmStatisticsService } from './farm-statistics.service';
import { FarmService } from './farm.service';
import {
    ContextServiceMock,
    FarmServiceMock,
    PairServiceMock,
} from './farm.test-mocks';

describe('FarmStatisticsService', () => {
    let service: FarmStatisticsService;

    const FarmServiceProvider = {
        provide: FarmService,
        useClass: FarmServiceMock,
    };

    const ContextServiceProvider = {
        provide: ContextService,
        useClass: ContextServiceMock,
    };

    const PairServiceProvider = {
        provide: PairService,
        useClass: PairServiceMock,
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
                RedisModule.register([
                    {
                        host: process.env.REDIS_URL,
                        port: parseInt(process.env.REDIS_PORT),
                        password: process.env.REDIS_PASSWORD,
                    },
                ]),
            ],
            providers: [
                FarmServiceProvider,
                ContextServiceProvider,
                PairServiceProvider,
                FarmStatisticsService,
                RedisCacheService,
            ],
        }).compile();

        service = module.get<FarmStatisticsService>(FarmStatisticsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get farmAPR', async () => {
        const farmAPR = await service.getFarmAPR('farm_address_1');
        expect(farmAPR).toEqual('2.628');
    });
});
