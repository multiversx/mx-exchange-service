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
import { FarmService } from './farm.service';
import { PairServiceMock } from './farm.test-mocks';
import { AbiFarmService } from './abi-farm.service';
import { AbiFarmServiceMock } from './abi.farm.service.mock';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import { ElrondApiServiceMock } from '../../services/elrond-communication/elrond.api.service.mock';
import { FarmTokenAttributesModel, RewardsModel } from './models/farm.model';
import { ContextServiceMock } from '../../services/context/context.service.mocks';

describe('FarmStatisticsService', () => {
    let service: FarmService;

    const AbiFarmServiceProvider = {
        provide: AbiFarmService,
        useClass: AbiFarmServiceMock,
    };

    const ElrondApiServiceProvider = {
        provide: ElrondApiService,
        useClass: ElrondApiServiceMock,
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
                AbiFarmServiceProvider,
                ElrondApiServiceProvider,
                ContextServiceProvider,
                PairServiceProvider,
                RedisCacheService,
                FarmService,
            ],
        }).compile();

        service = module.get<FarmService>(FarmService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get rewards with locked rewards', async () => {
        const attributes =
            'AAAABwc+9Mqu1tkAAAAAAAAAAQIBAAAACIrHIwSJ6AAAAAAAAAAAAAkBFY5GCRPQAAA=';
        const identifier = 'MEXFARM-abcd-01';
        const liquidity = '2000000000000000000';
        const rewards = await service.getRewardsForPosition({
            farmAddress: 'farm_address_1',
            identifier: identifier,
            attributes: attributes,
            liquidity: liquidity,
        });

        expect(rewards).toEqual(
            new RewardsModel({
                decodedAttributes: new FarmTokenAttributesModel({
                    identifier: 'MEXFARM-abcd-01',
                    attributes:
                        'AAAABwc+9Mqu1tkAAAAAAAAAAQIBAAAACIrHIwSJ6AAAAAAAAAAAAAkBFY5GCRPQAAA=',
                    rewardPerShare: '2039545930372825',
                    enteringEpoch: 1,
                    aprMultiplier: 2,
                    lockedRewards: true,
                    initialFarmingAmount: '10000000000000000000',
                    compoundedReward: '0',
                    currentFarmAmount: '20000000000000000000',
                }),
                remainingFarmingEpochs: 3,
                rewards: '1000000000000000000',
            }),
        );
    });
});
