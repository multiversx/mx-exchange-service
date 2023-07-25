import { scAddress } from 'src/config';
import { ILockedTokenWrapperAbiService } from '../services/interfaces';
import { LockedTokenWrapperAbiService } from '../services/locked-token-wrapper.abi.service';

export class LockedTokenWrapperAbiServiceMock
    implements ILockedTokenWrapperAbiService
{
    async wrappedTokenId(): Promise<string> {
        return 'WXMEX-123456';
    }

    energyFactoryAddress(): Promise<string> {
        return scAddress.simpleLockEnergy;
    }
}

export const LockedTokenWrapperAbiServiceProvider = {
    provide: LockedTokenWrapperAbiService,
    useClass: LockedTokenWrapperAbiServiceMock,
};
