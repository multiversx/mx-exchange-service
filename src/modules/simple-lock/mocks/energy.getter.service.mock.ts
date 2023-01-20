import { IEnergyGetterService } from '../../energy/services/interfaces';
import { EsdtToken } from '../../tokens/models/esdtToken.model';
import { EnergyType } from '@multiversx/sdk-exchange';
import { ErrorNotImplemented } from '../../../utils/errors.constants';
import { LockOption } from 'src/modules/energy/models/simple.lock.energy.model';

export class EnergyGetterHandlers implements IEnergyGetterService {
    getBaseAssetTokenID: () => Promise<string>;
    getBaseAssetToken: () => Promise<EsdtToken>;
    getLockOptions: () => Promise<LockOption[]>;
    getPauseState: () => Promise<boolean>;
    getOwnerAddress: () => Promise<string>;
    getEnergyEntryForUser: (userAddress: string) => Promise<EnergyType>;
    constructor(init: Partial<EnergyGetterHandlers>) {
        Object.assign(this, init);
    }
}

export class EnergyGetterServiceMock implements IEnergyGetterService {
    handlers: EnergyGetterHandlers;
    getBaseAssetToken(): Promise<EsdtToken> {
        if (this.handlers.getBaseAssetToken !== undefined) {
            return this.handlers.getBaseAssetToken();
        }
        ErrorNotImplemented();
    }

    getBaseAssetTokenID(): Promise<string> {
        if (this.handlers.getBaseAssetTokenID !== undefined) {
            return this.handlers.getBaseAssetTokenID();
        }
        ErrorNotImplemented();
    }

    getEnergyEntryForUser(userAddress: string): Promise<EnergyType> {
        if (this.handlers.getEnergyEntryForUser !== undefined) {
            return this.handlers.getEnergyEntryForUser(userAddress);
        }
        ErrorNotImplemented();
    }

    getLockOptions(): Promise<LockOption[]> {
        if (this.handlers.getLockOptions !== undefined) {
            return this.handlers.getLockOptions();
        }
        ErrorNotImplemented();
    }

    getOwnerAddress(): Promise<string> {
        if (this.handlers.getOwnerAddress !== undefined) {
            return this.handlers.getOwnerAddress();
        }
        ErrorNotImplemented();
    }

    getPauseState(): Promise<boolean> {
        if (this.handlers.getPauseState !== undefined) {
            return this.handlers.getPauseState();
        }
        ErrorNotImplemented();
    }

    constructor(init: Partial<EnergyGetterHandlers>) {
        this.handlers = new EnergyGetterHandlers(init);
    }
}
