import { FeesCollectorAbiService } from '../services/fees-collector.abi.service';
import { IFeesCollectorAbiService } from '../services/interfaces';

export class FeesCollectorAbiServiceMock implements IFeesCollectorAbiService {
    async accumulatedFees(week: number, token: string): Promise<string> {
        return '0';
    }

    async lockedTokensPerEpoch(): Promise<string> {
        return '0';
    }

    async allTokens(): Promise<string[]> {
        return [];
    }
}

export const FeesCollectorAbiServiceProvider = {
    provide: FeesCollectorAbiService,
    useClass: FeesCollectorAbiServiceMock,
};
