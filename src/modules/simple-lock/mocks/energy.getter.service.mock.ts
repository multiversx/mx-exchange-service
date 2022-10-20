import { IEnergyGetterService } from "../interfaces";
import { EsdtToken } from "../../tokens/models/esdtToken.model";
import { EnergyType } from "@elrondnetwork/erdjs-dex";
import { ErrorNotImplemented } from "../../../utils/errors.constants";

export class EnergyGetterServiceMock implements IEnergyGetterService {
    getBaseAssetTokenIDCalled:() => Promise<string>;
    getBaseAssetTokenCalled:() => Promise<EsdtToken>;
    getLockOptionsCalled:() => Promise<number[]>;
    getPauseStateCalled:() => Promise<boolean>;
    getOwnerAddressCalled:() => Promise<string>;
    getEnergyEntryForUserCalled:(userAddress: string) => Promise<EnergyType>;

    getBaseAssetToken(): Promise<EsdtToken> {
        if (this.getBaseAssetTokenCalled !== undefined) {
            return this.getBaseAssetTokenCalled();
        }
        throw ErrorNotImplemented
    }

    getBaseAssetTokenID(): Promise<string> {
        if (this.getBaseAssetTokenIDCalled !== undefined) {
            return this.getBaseAssetTokenIDCalled();
        }
        throw ErrorNotImplemented
    }

    getEnergyEntryForUser(userAddress: string): Promise<EnergyType> {
        if (this.getEnergyEntryForUserCalled !== undefined) {
            return this.getEnergyEntryForUserCalled(userAddress);
        }
        throw ErrorNotImplemented
    }

    getLockOptions(): Promise<number[]> {
        if (this.getLockOptionsCalled !== undefined) {
            return this.getLockOptionsCalled();
        }
        throw ErrorNotImplemented
    }

    getOwnerAddress(): Promise<string> {
        if (this.getOwnerAddressCalled !== undefined) {
            return this.getOwnerAddressCalled();
        }
        throw ErrorNotImplemented
    }

    getPauseState(): Promise<boolean> {
        if (this.getPauseStateCalled !== undefined) {
            return this.getPauseStateCalled();
        }
        throw ErrorNotImplemented
    }

}