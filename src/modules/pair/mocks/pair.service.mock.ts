import { PairService } from '../services/pair.service';
import { PairsData } from './pair.constants';

export class PairServiceMock {
    async getAllLpTokensIds(pairAddresses: string[]): Promise<string[]> {
        return pairAddresses.map(
            (address) => PairsData(address).liquidityPoolToken.identifier,
        );
    }
    async getAllFeeStates(pairAddresses: string[]): Promise<boolean[]> {
        return pairAddresses.map((address) => PairsData(address).feeState);
    }
    async getAllLockedValueUSD(pairAddresses: string[]): Promise<string[]> {
        return pairAddresses.map(
            (address) => PairsData(address).lockedValueUSD,
        );
    }
}

export const PairServiceProvider = {
    provide: PairService,
    useClass: PairServiceMock,
};
