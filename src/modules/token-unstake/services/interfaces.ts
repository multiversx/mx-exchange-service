import { UnstakePairModel } from '../models/token.unstake.model';

export interface ITokenUnstakeAbiService {
    unbondEpochs(): Promise<number>;
    feesBurnPercentage(): Promise<number>;
    feesCollectorAddress(): Promise<string>;
    energyFactoryAddress(): Promise<string>;
    unlockedTokensForUser(userAddress: string): Promise<UnstakePairModel[]>;
}
