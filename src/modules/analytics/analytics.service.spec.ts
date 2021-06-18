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

describe('FarmStatisticsService', () => {
    let service: AnalyticsService;
    let elrondProxy: ElrondProxyService;

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

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [ElrondCommunicationModule],
            providers: [
                ContextServiceProvider,
                FarmServiceProvider,
                PairServiceProvider,
                AnalyticsService,
            ],
        }).compile();

        service = module.get<AnalyticsService>(AnalyticsService);
        elrondProxy = module.get<ElrondProxyService>(ElrondProxyService);
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

        const totalMexSupply = await service.getTotalTokenSupply('MEX-bd9937');
        expect(totalMexSupply).toEqual('810');
    });
});
