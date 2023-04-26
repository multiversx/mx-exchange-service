import { scAddress } from 'src/config';
import { ILockedTokenWrapperAbiService } from '../services/interfaces';
import { LockedTokenWrapperAbiService } from '../services/locked-token-wrapper.abi.service';

export class LockedTokenWrapperAbiServiceMock
    implements ILockedTokenWrapperAbiService
{
    async wrappedTokenId(address: string): Promise<string> {
        return 'WXMEX-123456';
    }

    energyFactoryAddress(address: string): Promise<string> {
        return scAddress.simpleLockEnergy;
    }
}

export const LockedTokenWrapperAbiServiceProvider = {
    provide: LockedTokenWrapperAbiService,
    useClass: LockedTokenWrapperAbiServiceMock,
};
