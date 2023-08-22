import { AnalyticsComputeService } from '../services/analytics.compute.service';
import { IAnalyticsComputeService } from '../services/interfaces';

export class AnalyticsComputeServiceMock implements IAnalyticsComputeService {
    lockedValueUSDFarms(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    totalValueLockedUSD(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    totalValueStakedUSD(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    totalAggregatedRewards(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    totalLockedMexStakedUSD(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    feeTokenBurned(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    penaltyTokenBurned(): Promise<string> {
        throw new Error('Method not implemented.');
    }
}

export const AnalyticsComputeServiceProvider = {
    provide: AnalyticsComputeService,
    useClass: AnalyticsComputeServiceMock,
};
