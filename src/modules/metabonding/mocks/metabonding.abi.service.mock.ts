import { UserEntryModel } from '../models/metabonding.model';
import { IMetabondingAbiService } from '../services/interfaces';
import { MetabondingAbiService } from '../services/metabonding.abi.service';

export class MetabondingAbiServiceMock implements IMetabondingAbiService {
    async lockedAssetTokenID(): Promise<string> {
        return 'LKMEX-abcdef';
    }
    totalLockedAssetSupply(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    stakedAmountForUser(userAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async userEntry(userAddress: string): Promise<UserEntryModel> {
        return new UserEntryModel({
            stakedAmount: '0',
            tokenNonce: 0,
            unbondEpoch: 0,
            unstakedAmount: '0',
        });
    }
}

export const MetabondingAbiServiceMockProvider = {
    provide: MetabondingAbiService,
    useClass: MetabondingAbiServiceMock,
};
