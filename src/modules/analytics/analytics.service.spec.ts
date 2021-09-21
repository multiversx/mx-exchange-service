import { SmartContract } from '@elrondnetwork/erdjs/out';
import { Test, TestingModule } from '@nestjs/testing';
import BigNumber from 'bignumber.js';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import { ContextService } from '../../services/context/context.service';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { FarmService } from '../farm/services/farm.service';
import { FarmServiceMock } from '../farm/mocks/farm.test-mocks';
import { PairService } from '../pair/pair.service';
import { AnalyticsService } from './analytics.service';
import { HyperblockService } from '../../services/transactions/hyperblock.service';
import { ShardTransaction } from '../../services/transactions/entities/shard.transaction';
import { TransactionModule } from '../../services/transactions/transaction.module';
import { TransactionCollectorService } from '../../services/transactions/transaction.collector.service';
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
import { CommonAppModule } from '../../common.app.module';
import { CachingModule } from '../../services/caching/cache.module';

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

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                CommonAppModule,
                CachingModule,
                ElrondCommunicationModule,
                TransactionModule,
            ],
            providers: [
                ContextServiceProvider,
                FarmServiceProvider,
                PairServiceProvider,
                PairAnalyticsServiceProvider,
                AnalyticsService,
                HyperblockService,
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

        const totalMexSupply = await service.computeTotalTokenSupply(
            'MEX-ec32fa',
        );
        expect(totalMexSupply).toEqual('630');
    });

    it('should get trading volumes', async () => {
        jest.spyOn(pairService, 'getFirstTokenID').mockImplementation(
            async () => 'WEGLD-073650',
        );
        jest.spyOn(pairService, 'getSecondTokenID').mockImplementation(
            async () => 'MEX-ec32fa',
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
                    'RVNEVFRyYW5zZmVyQDU3NDU0NzRjNDQyZDMwMzczMzM2MzUzMEAwZGUwYjZiM2E3NjQwMDAwQDczNzc2MTcwNTQ2ZjZiNjU2ZTczNDY2OTc4NjU2NDQ5NmU3MDc1NzRANGQ0NTU4MmQ2NTYzMzMzMjY2NjFAMGQyZGMwODM0MGQ4ZWUxMDAw';
                transaction.sender = '';
                transaction.receiver =
                    'erd1qqqqqqqqqqqqqpgquh2r06qrjesfv5xj6v8plrqm93c6xvw70n4sfuzpmc';
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
                            'erd1qqqqqqqqqqqqqpgquh2r06qrjesfv5xj6v8plrqm93c6xvw70n4sfuzpmc',
                        totalValueLockedFirstToken: '5',
                        totalValueLockedSecondToken: '5000',
                        totalValueLockedUSD: '1000',
                        volumesUSD: '62.15522261',
                    }),
                    new PairAnalyticsModel({
                        feesUSD: '0',
                        liquidity: '50',
                        pairAddress:
                            'erd1qqqqqqqqqqqqqpgqmffr70826epqhdf2ggsmgxgur77g53hr0n4s38y2qe',
                        totalValueLockedFirstToken: '5',
                        totalValueLockedSecondToken: '5000',
                        totalValueLockedUSD: '1000',
                        volumesUSD: '0',
                    }),
                ],
                tokens: [
                    new TokenAnalyticsModel({
                        feesUSD: '0.3',
                        tokenID: 'WEGLD-073650',
                        totalValueLocked: '5',
                        totalValueLockedUSD: '500',
                        volume: '1000000000000000000',
                        volumeUSD: '100',
                    }),
                    new TokenAnalyticsModel({
                        feesUSD: '0',
                        tokenID: 'MEX-ec32fa',
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
