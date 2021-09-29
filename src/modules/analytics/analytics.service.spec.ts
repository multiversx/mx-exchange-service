import { Test, TestingModule } from '@nestjs/testing';
import BigNumber from 'bignumber.js';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import { ContextService } from '../../services/context/context.service';
import { PairService } from '../pair/services/pair.service';
import { AnalyticsService } from './analytics.service';
import { HyperblockService } from '../../services/transactions/hyperblock.service';
import { ShardTransaction } from '../../services/transactions/entities/shard.transaction';
import { TransactionCollectorService } from '../../services/transactions/transaction.collector.service';
import { ContextServiceMock } from '../../services/context/context.service.mocks';
import { PairAnalyticsServiceMock } from '../pair/mocks/pair.analytics.service.mock';
import { PairAnalyticsService } from '../pair/services/pair.analytics.service';
import { PairServiceMock } from '../pair/mocks/pair.service.mock';
import {
    AnalyticsModel,
    FactoryAnalyticsModel,
    PairAnalyticsModel,
    TokenAnalyticsModel,
} from './models/analytics.model';
import { CommonAppModule } from '../../common.app.module';
import { CachingModule } from '../../services/caching/cache.module';
import { FarmGetterService } from '../farm/services/farm.getter.service';
import { FarmGetterServiceMock } from '../farm/mocks/farm.getter.service.mock';
import { PairGetterService } from '../pair/services/pair.getter.service';
import { PairGetterServiceMock } from '../pair/mocks/pair.getter.service.mock';
import { PairComputeService } from '../pair/services/pair.compute.service';
import { ElrondProxyServiceMock } from 'src/services/elrond-communication/elrond.proxy.service.mock';
import { PriceFeedService } from 'src/services/price-feed/price-feed.service';
import { PriceFeedServiceMock } from 'src/services/price-feed/price.feed.service.mock';
import { TransactionInterpreterService } from 'src/services/transactions/transaction.interpreter.service';
import { TransactionMappingService } from 'src/services/transactions/transaction.mapping.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { ElrondApiServiceMock } from 'src/services/elrond-communication/elrond.api.service.mock';

describe('FarmStatisticsService', () => {
    let service: AnalyticsService;
    let transactionCollector: TransactionCollectorService;

    const FarmGetterServiceProvider = {
        provide: FarmGetterService,
        useClass: FarmGetterServiceMock,
    };

    const PairServiceProvider = {
        provide: PairService,
        useClass: PairServiceMock,
    };

    const PairGetterServiceProvider = {
        provide: PairGetterService,
        useClass: PairGetterServiceMock,
    };

    const PairAnalyticsServiceProvider = {
        provide: PairAnalyticsService,
        useClass: PairAnalyticsServiceMock,
    };

    const ContextServiceProvider = {
        provide: ContextService,
        useClass: ContextServiceMock,
    };

    const ElrondApiServiceProvider = {
        provide: ElrondApiService,
        useClass: ElrondApiServiceMock,
    };

    const ElrondProxyServiceProvider = {
        provide: ElrondProxyService,
        useClass: ElrondProxyServiceMock,
    };

    const PriceFeedServiceProvider = {
        provide: PriceFeedService,
        useClass: PriceFeedServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                ContextServiceProvider,
                ElrondProxyServiceProvider,
                ElrondApiServiceProvider,
                FarmGetterServiceProvider,
                PairServiceProvider,
                PairGetterServiceProvider,
                PairComputeService,
                PriceFeedServiceProvider,
                PairAnalyticsServiceProvider,
                AnalyticsService,
                HyperblockService,
                TransactionCollectorService,
                TransactionInterpreterService,
                TransactionMappingService,
            ],
        }).compile();

        service = module.get<AnalyticsService>(AnalyticsService);
        transactionCollector = module.get<TransactionCollectorService>(
            TransactionCollectorService,
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get total value locked in farms', async () => {
        const totalLockedValueUSDFarms = await service.getLockedValueUSDFarms();
        expect(totalLockedValueUSDFarms.toString()).toEqual('360000000');
    });

    it('should get total MEX supply', async () => {
        jest.spyOn(service, 'getMintedToken').mockImplementation(
            async () => new BigNumber(100),
        );
        jest.spyOn(service, 'getBurnedToken').mockImplementation(
            async () => new BigNumber(10),
        );

        const totalMexSupply = await service.computeTotalTokenSupply(
            'TOK2-2222',
        );
        expect(totalMexSupply).toEqual('2000000000000000630');
    });

    it('should get trading volumes', async () => {
        jest.spyOn(
            transactionCollector,
            'getNewTransactions',
        ).mockImplementation(async () => {
            const newTransactions = [];

            for (let index = 0; index < 1; index++) {
                const transaction = new ShardTransaction();
                transaction.data =
                    'RVNEVFRyYW5zZmVyQDU0NGY0YjMxMmQzMTMxMzEzMUAwZGUwYjZiM2E3NjQwMDAwQDczNzc2MTcwNTQ2ZjZiNjU2ZTczNDY2OTc4NjU2NDQ5NmU3MDc1NzRANTQ0ZjRiMzIyZDMyMzIzMjMyQDBkMmRjMDgzNDBkOGVlMTAwMA==';
                transaction.sender = '';
                transaction.receiver = 'pair_address_1';
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
                    totalFeesUSD: '0.6',
                    totalVolumesUSD: '12255.22261',
                    totalValueLockedUSD: '120002000',
                }),
                pairs: [
                    new PairAnalyticsModel({
                        feesUSD: '0.6',
                        liquidity: '1000000000000000000',
                        pairAddress: 'pair_address_1',
                        totalValueLockedFirstToken: '1000000000000000000',
                        totalValueLockedSecondToken: '2000000000000000000',
                        totalValueLockedUSD: '1000',
                        volumesUSD: '12255.22261',
                    }),
                    new PairAnalyticsModel({
                        feesUSD: '0',
                        liquidity: '1000000000000000000',
                        pairAddress: 'pair_address_2',
                        totalValueLockedFirstToken: '1000000000000000000',
                        totalValueLockedSecondToken: '2000000000000000000',
                        totalValueLockedUSD: '1000',
                        volumesUSD: '0',
                    }),
                ],
                tokens: [
                    new TokenAnalyticsModel({
                        feesUSD: '0.6',
                        tokenID: 'TOK1-1111',
                        totalValueLocked: '1000000000000000000',
                        totalValueLockedUSD: '500',
                        volume: '1000000000000000000',
                        volumeUSD: '200',
                    }),
                    new TokenAnalyticsModel({
                        feesUSD: '0',
                        tokenID: 'TOK2-2222',
                        totalValueLocked: '2000000000000000000',
                        totalValueLockedUSD: '500',
                        volume: '243104452200000000000',
                        volumeUSD: '24310.44522',
                    }),
                    new TokenAnalyticsModel({
                        feesUSD: '0',
                        tokenID: 'TOK3-3333',
                        totalValueLocked: '2000000000000000000',
                        totalValueLockedUSD: '500',
                        volume: '0',
                        volumeUSD: '0',
                    }),
                ],
            }),
        );
    });
});
