import { UserEntryModel } from '../models/metabonding.model';

export interface IMetabondingAbiService {
    lockedAssetTokenID(): Promise<string>;
    totalLockedAssetSupply(): Promise<string>;
    stakedAmountForUser(userAddress: string): Promise<string>;
    userEntry(userAddress: string): Promise<UserEntryModel>;
}
