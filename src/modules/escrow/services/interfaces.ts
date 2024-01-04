import { ScheduledTransferModel } from '../models/escrow.model';

export interface EscrowAbiServiceInterface {
    energyFactoryAddress(): Promise<string>;
    lockedTokenID(): Promise<string>;
    minLockEpochs(): Promise<number>;
    epochsCooldownDuration(): Promise<number>;
    scheduledTransfers(
        receiverAddress: string,
    ): Promise<ScheduledTransferModel[]>;
    allSenders(address: string): Promise<string[]>;
    allReceivers(address: string): Promise<string[]>;
}
