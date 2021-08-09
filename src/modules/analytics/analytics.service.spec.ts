import { SmartContract } from '@elrondnetwork/erdjs/out';
import { Test, TestingModule } from '@nestjs/testing';
import BigNumber from 'bignumber.js';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import { ContextService } from '../../services/context/context.service';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { FarmService } from '../farm/farm.service';
import { FarmServiceMock } from '../farm/farm.test-mocks';
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
import { ContextServiceMock } from '../../services/context/context.service.mocks';
import { PairAnalyticsServiceMock } from '../pair/pair.analytics.service.mock';
import { PairAnalyticsService } from '../pair/pair.analytics.service';
import { PairInfoModel } from '../pair/models/pair-info.model';
import { PairServiceMock } from '../pair/pair.service.mock';
import {
    AnalyticsModel,
    FactoryAnalyticsModel,
    PairAnalyticsModel,
    TokenAnalyticsModel,
} from './models/analytics.model';

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

    const PairAnalyticsServiceProvider = {
        provide: PairAnalyticsService,
        useClass: PairAnalyticsServiceMock,
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
                PairAnalyticsServiceProvider,
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
        expect(totalMexSupply).toEqual('630');
    });

    it('should get trading volumes', async () => {
        jest.spyOn(pairService, 'getFirstTokenID').mockImplementation(
            async () => 'WEGLD-88600a',
        );
        jest.spyOn(pairService, 'getSecondTokenID').mockImplementation(
            async () => 'MEX-b6bb7d',
        );
        jest.spyOn(pairService, 'getPairInfoMetadata').mockImplementation(
            async () =>
                new PairInfoModel({
                    reserves0: '5',
                    reserves1: '500',
                    totalSupply: '50',
                }),
        );
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

            for (let index = 0; index < 1; index++) {
                const transaction = new ShardTransaction();
                transaction.data =
                    'RVNEVFRyYW5zZmVyQDU3NDU0NzRjNDQyZDM4MzgzNjMwMzA2MUAwZGUwYjZiM2E3NjQwMDAwQDczNzc2MTcwNTQ2ZjZiNjU2ZTczNDY2OTc4NjU2NDQ5NmU3MDc1NzRANGQ0NTU4MmQ2MjM2NjI2MjM3NjRAMGQyZGMwODM0MGQ4ZWUxMDAw';
                transaction.sender = '';
                transaction.receiver =
                    'erd1qqqqqqqqqqqqqpgqyt7u9afy0d9yp70rlg7znsp0u0j8zxq60n4ser3kww';
                transaction.sourceShard = 1;
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

        expect(tradingVolumes).toEqual(
            new AnalyticsModel({
                factory: new FactoryAnalyticsModel({
                    totalFeesUSD: '0.3',
                    totalVolumesUSD: '62.15522261',
                    totalValueLockedUSD: '120002000',
                }),
                pairs: [
                    new PairAnalyticsModel({
                        feesUSD: '0.3',
                        liquidity: '50',
                        pairAddress:
                            'erd1qqqqqqqqqqqqqpgqyt7u9afy0d9yp70rlg7znsp0u0j8zxq60n4ser3kww',
                        totalValueLockedFirstToken: '5',
                        totalValueLockedSecondToken: '5000',
                        totalValueLockedUSD: '1000',
                        volumesUSD: '62.15522261',
                    }),
                    new PairAnalyticsModel({
                        feesUSD: '0',
                        liquidity: '50',
                        pairAddress:
                            'erd1qqqqqqqqqqqqqpgq3gmttefd840klya8smn7zeae402w2esw0n4sm8m04f',
                        totalValueLockedFirstToken: '5',
                        totalValueLockedSecondToken: '5000',
                        totalValueLockedUSD: '1000',
                        volumesUSD: '0',
                    }),
                ],
                tokens: [
                    new TokenAnalyticsModel({
                        feesUSD: '0.3',
                        tokenID: 'WEGLD-88600a',
                        totalValueLocked: '5',
                        totalValueLockedUSD: '500',
                        volume: '1000000000000000000',
                        volumeUSD: '100',
                    }),
                    new TokenAnalyticsModel({
                        feesUSD: '0',
                        tokenID: 'MEX-b6bb7d',
                        totalValueLocked: '5000',
                        totalValueLockedUSD: '500',
                        volume: '243104452200000000000',
                        volumeUSD: '24.31044522',
                    }),
                ],
            }),
        );
    });
});
