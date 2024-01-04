import { Address } from '@multiversx/sdk-core/out';
import {
    LockedFundsModel,
    ScheduledTransferModel,
} from '../models/escrow.model';
import { EscrowAbiService } from '../services/escrow.abi.service';
import { EscrowAbiServiceInterface } from '../services/interfaces';

class EscrowAbiServiceMock implements EscrowAbiServiceInterface {
    energyFactoryAddress(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    lockedTokenID(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    minLockEpochs(): Promise<number> {
        throw new Error('Method not implemented.');
    }
    epochsCooldownDuration(): Promise<number> {
        throw new Error('Method not implemented.');
    }
    async scheduledTransfers(
        receiverAddress: string,
    ): Promise<ScheduledTransferModel[]> {
        return [
            new ScheduledTransferModel({
                sender: Address.Zero().bech32(),
                lockedFunds: new LockedFundsModel({
                    funds: [
                        {
                            tokenIdentifier: 'ELKMEX-123456',
                            tokenNonce: 1,
                            amount: '1000000000000000000',
                        },
                    ],
                    lockedEpoch: 1,
                }),
            }),
        ];
    }
    allSenders(address: string): Promise<string[]> {
        throw new Error('Method not implemented.');
    }
    allReceivers(address: string): Promise<string[]> {
        throw new Error('Method not implemented.');
    }
}

export const EscrowAbiServiceProvider = {
    provide: EscrowAbiService,
    useClass: EscrowAbiServiceMock,
};
