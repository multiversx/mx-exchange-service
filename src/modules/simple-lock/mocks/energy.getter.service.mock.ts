import { IEnergyGetterService } from "../interfaces";
import { EsdtToken } from "../../tokens/models/esdtToken.model";
import { EnergyType } from "@elrondnetwork/erdjs-dex";
import { ErrorNotImplemented } from "../../../utils/errors.constants";

export class EnergyGetterHandlers implements IEnergyGetterService {
    getBaseAssetTokenID:() => Promise<string>;
    getBaseAssetToken:() => Promise<EsdtToken>;
    getLockOptions:() => Promise<number[]>;
    getPauseState:() => Promise<boolean>;
    getOwnerAddress:() => Promise<string>;
    getEnergyEntryForUser:(userAddress: string) => Promise<EnergyType>;
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
        throw ErrorNotImplemented
    }

    getBaseAssetTokenID(): Promise<string> {
        if (this.handlers.getBaseAssetTokenID !== undefined) {
            return this.handlers.getBaseAssetTokenID();
        }
        throw ErrorNotImplemented
    }

    getEnergyEntryForUser(userAddress: string): Promise<EnergyType> {
        if (this.handlers.getEnergyEntryForUser !== undefined) {
            return this.handlers.getEnergyEntryForUser(userAddress);
        }
        throw ErrorNotImplemented
    }

    getLockOptions(): Promise<number[]> {
        if (this.handlers.getLockOptions !== undefined) {
            return this.handlers.getLockOptions();
        }
        throw ErrorNotImplemented
    }

    getOwnerAddress(): Promise<string> {
        if (this.handlers.getOwnerAddress !== undefined) {
            return this.handlers.getOwnerAddress();
        }
        throw ErrorNotImplemented
    }

    getPauseState(): Promise<boolean> {
        if (this.handlers.getPauseState !== undefined) {
            return this.handlers.getPauseState();
        }
        throw ErrorNotImplemented
    }

    constructor(init: Partial<EnergyGetterHandlers>) {
        this.handlers = new EnergyGetterHandlers(init)
    }
}
