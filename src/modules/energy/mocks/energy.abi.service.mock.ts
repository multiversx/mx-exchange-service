import { EnergyType } from '@multiversx/sdk-exchange';
import BigNumber from 'bignumber.js';
import { LockOption } from '../models/simple.lock.energy.model';
import { IEnergyAbiService } from '../services/interfaces';
import { EnergyAbiService } from '../services/energy.abi.service';

export class EnergyAbiServiceMock implements IEnergyAbiService {
    async baseAssetTokenID(): Promise<string> {
        return 'MEX-123456';
    }
    async lockedTokenID(): Promise<string> {
        return 'ELKMEX-123456';
    }
    async legacyLockedTokenID(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async lockOptions(): Promise<LockOption[]> {
        throw new Error('Method not implemented.');
    }
    async tokenUnstakeScAddress(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async ownerAddress(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async energyEntryForUser(userAddress: string): Promise<EnergyType> {
        throw new Error('Method not implemented.');
    }
    async energyAmountForUser(userAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async getPenaltyAmount(
        tokenAmount: BigNumber,
        prevLockEpochs: number,
        epochsToReduce: number,
    ): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async isPaused(): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
}

export const EnergyAbiServiceProvider = {
    provide: EnergyAbiService,
    useClass: EnergyAbiServiceMock,
};
