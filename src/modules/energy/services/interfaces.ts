import { EnergyType } from '@multiversx/sdk-exchange';
import { LockOption } from '../models/simple.lock.energy.model';
import BigNumber from 'bignumber.js';

export interface IEnergyComputeService {
    depleteUserEnergy(
        energyEntry: EnergyType,
        currentEpoch: number,
    ): EnergyType;
}

export interface IEnergyAbiService {
    baseAssetTokenID(): Promise<string>;
    lockedTokenID(): Promise<string>;
    legacyLockedTokenID(): Promise<string>;
    lockOptions(): Promise<LockOption[]>;
    tokenUnstakeScAddress(): Promise<string>;
    ownerAddress(): Promise<string>;
    energyEntryForUser(userAddress: string): Promise<EnergyType>;
    energyAmountForUser(userAddress: string): Promise<string>;
    getPenaltyAmount(
        tokenAmount: BigNumber,
        prevLockEpochs: number,
        epochsToReduce: number,
    ): Promise<string>;
    isPaused(): Promise<boolean>;
}
