import { UnstakePairModel } from '../models/token.unstake.model';

export interface ITokenUnstakeAbiService {
    unbondEpochs(): Promise<number>;
    feesBurnPercentage(): Promise<number>;
    feesCollectorAddress(): Promise<string>;
    lastEpochFeeSentToCollector(): Promise<number>;
    energyFactoryAddress(): Promise<string>;
    unlockedTokensForUser(userAddress: string): Promise<UnstakePairModel[]>;
}
