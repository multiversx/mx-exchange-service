import { SmartContract } from '@elrondnetwork/erdjs/out';
import { Test, TestingModule } from '@nestjs/testing';
import BigNumber from 'bignumber.js';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import { ContextService } from '../../services/context/context.service';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { FarmService } from '../farm/farm.service';
import {
    ContextServiceMock,
    FarmServiceMock,
    PairServiceMock,
} from '../farm/farm.test-mocks';
import { PairService } from '../pair/pair.service';
import { AnalyticsService } from './analytics.service';
import { HyperblockService } from '../../services/transactions/hyperblock.service';
import { ShardTransaction } from '../../services/transactions/entities/shard.transaction';
import { TransactionModule } from '../../services/transactions/transaction.module';
import { TransactionCollectorService } from '../../services/transactions/transaction.collector.service';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';
import * as Transport from 'winston-transport';
import { RedisCacheService } from '../../services/redis-cache.service';
import { RedisModule } from 'nestjs-redis';

describe('FarmStatisticsService', () => {
    let service: AnalyticsService;
    let elrondProxy: ElrondProxyService;
    let transactionCollector: TransactionCollectorService;
    let pairService: PairService;

    const FarmServiceProvider = {
        provide: FarmService,
        useClass: FarmServiceMock,
    };

    const PairServiceProvider = {
        provide: PairService,
        useClass: PairServiceMock,
    };

    const ContextServiceProvider = {
        provide: ContextService,
        useClass: ContextServiceMock,
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
                ElrondCommunicationModule,
                TransactionModule,
                RedisModule.register([
                    {
                        host: process.env.REDIS_URL,
                        port: parseInt(process.env.REDIS_PORT),
                        password: process.env.REDIS_PASSWORD,
                    },
                ]),
            ],
            providers: [
                ContextServiceProvider,
                FarmServiceProvider,
                PairServiceProvider,
                AnalyticsService,
                HyperblockService,
                RedisCacheService,
            ],
        }).compile();

        service = module.get<AnalyticsService>(AnalyticsService);
        elrondProxy = module.get<ElrondProxyService>(ElrondProxyService);
        transactionCollector = module.get<TransactionCollectorService>(
            TransactionCollectorService,
        );
        pairService = module.get<PairService>(PairService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get total value locked in farms', async () => {
        const totalLockedValueUSDFarms = await service.getLockedValueUSDFarms();
        expect(totalLockedValueUSDFarms.toString()).toEqual('360000000');
    });

    it('should get total MEX supply', async () => {
        jest.spyOn(elrondProxy, 'getSmartContract').mockImplementation(
            async () => new SmartContract({}),
        );
        jest.spyOn(service, 'getMintedToken').mockImplementation(
            async () => new BigNumber(100),
        );
        jest.spyOn(service, 'getBurnedToken').mockImplementation(
            async () => new BigNumber(10),
        );

        const totalMexSupply = await service.getTotalTokenSupply('MEX-b6bb7d');
        expect(totalMexSupply).toEqual('810');
    });

    it('should get trading volumes', async () => {
        jest.spyOn(pairService, 'getFirstTokenPriceUSD').mockImplementation(
            async () => '100',
        );
        jest.spyOn(pairService, 'getSecondTokenPriceUSD').mockImplementation(
            async () => '0.1',
        );
        jest.spyOn(
            transactionCollector,
            'getNewTransactions',
        ).mockImplementation(async () => {
            const newTransactions = [];

            const pairsAddress = [
                'erd1qqqqqqqqqqqqqpgqx0xh8fgpr5kjh9n7s53m7qllw42m5t7u0n4suz39xc',
                'erd1qqqqqqqqqqqqqpgqlsepv678hp2sv30wcslwqh9s09m9kqaa0n4smta0sj',
            ];

            for (let index = 0; index < 10; index++) {
                const transaction = new ShardTransaction();
                transaction.data =
                    'RVNEVFRyYW5zZmVyQDU3NTg0NTQ3NGM0NDJkNjQ2MTMzNjYzMjM0QDBkZTBiNmIzYTc2NDAwMDBANzM3NzYxNzA1NDZmNmI2NTZlNzM0NjY5Nzg2NTY0NDk2ZTcwNzU3NEA0ZDQ1NTgyZDM1MzMzMTM2MzIzM0AwMTUxYjZmNjAxZTYzMGRlMzY=';
                transaction.sender = '';
                transaction.receiver = pairsAddress[0];
                transaction.sourceShard = 0;
                transaction.destinationShard = 1;
                transaction.hash = '';
                transaction.nonce = 0;
                transaction.status = '';
                transaction.value = 0;
                newTransactions.push(transaction);
            }

            for (let index = 0; index < 10; index++) {
                const transaction = new ShardTransaction();
                transaction.data =
                    'RVNEVFRyYW5zZmVyQDU3NTg0NTQ3NGM0NDJkNjQ2MTMzNjYzMjM0QDBkZTBiNmIzYTc2NDAwMDBANzM3NzYxNzA1NDZmNmI2NTZlNzM0NjY5Nzg2NTY0NDk2ZTcwNzU3NEA0ZDQ1NTgyZDM1MzMzMTM2MzIzM0AwMTUxYjZmNjAxZTYzMGRlMzY=';
                transaction.sender = '';
                transaction.receiver = pairsAddress[1];
                transaction.sourceShard = 0;
                transaction.destinationShard = 1;
                transaction.hash = '';
                transaction.nonce = 0;
                transaction.status = '';
                transaction.value = 0;
                newTransactions.push(transaction);
            }

            return newTransactions;
        });

        const tradingVolumes = await service.getAnalytics();

        expect(tradingVolumes).toEqual({
            factory: {
                totalVolumesUSD: '1001',
                totalFeesUSD: '30.03',
            },
            pairs: [
                {
                    pairAddress:
                        'erd1qqqqqqqqqqqqqpgqx0xh8fgpr5kjh9n7s53m7qllw42m5t7u0n4suz39xc',
                    volumesUSD: '500.5',
                    feesUSD: '15.015',
                },
                {
                    pairAddress:
                        'erd1qqqqqqqqqqqqqpgqlsepv678hp2sv30wcslwqh9s09m9kqaa0n4smta0sj',
                    volumesUSD: '500.5',
                    feesUSD: '15.015',
                },
            ],
        });
    });
});
