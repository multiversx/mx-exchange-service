import { PairMetadata } from "../models/pair.metadata.model";
import { EnableSwapByUserConfig } from "../models/factory.model";
import { PairTokens } from "../../pair/models/pair.model";
import { IRouterGetterService } from "../interfaces";
import { ErrorNotImplemented } from "../../../utils/errors.constants";


export class RouterGetterHandlers implements IRouterGetterService {
    getAllPairsAddress: () => Promise<string[]>;
    getPairsMetadata: () => Promise<PairMetadata[]>;
    getPairMetadata:(pairAddress: string) => Promise<PairMetadata>;
    getEnableSwapByUserConfig: () => Promise<EnableSwapByUserConfig>;
    getCommonTokensForUserPairs: () => Promise<string[]>;
    getTotalLockedValueUSD: () => Promise<string>;
    getTotalVolumeUSD:(time: string) => Promise<string>;
    getTotalFeesUSD:(time: string) => Promise<string>;
    getPairCount: () => Promise<number>;
    getTotalTxCount: () => Promise<number>;
    getPairCreationEnabled: () => Promise<boolean>;
    getLastErrorMessage: () => Promise<string>;
    getState: () => Promise<boolean>;
    getOwner: () => Promise<string>;
    getAllPairsManagedAddresses: () => Promise<string[]>;
    getAllPairTokens: () => Promise<PairTokens[]>;
    getPairTemplateAddress: () => Promise<string>;
    getTemporaryOwnerPeriod: () => Promise<string>;
    constructor(init: Partial<RouterGetterHandlers>) {
        Object.assign(this, init);
    }
}

export class RouterGetterServiceMock implements IRouterGetterService {
    handlers: RouterGetterHandlers
    getAllPairTokens(): Promise<PairTokens[]> {
        if (this.handlers.getAllPairTokens !== undefined) {
            return this.handlers.getAllPairTokens();
        }
        throw ErrorNotImplemented
    }

    getAllPairsAddress(): Promise<string[]> {
        if (this.handlers.getAllPairsAddress !== undefined) {
            return this.handlers.getAllPairsAddress();
        }
        throw ErrorNotImplemented
    }

    getAllPairsManagedAddresses(): Promise<string[]> {
        if (this.handlers.getAllPairsManagedAddresses !== undefined) {
            return this.handlers.getAllPairsManagedAddresses();
        }
        throw ErrorNotImplemented
    }

    getCommonTokensForUserPairs(): Promise<string[]> {
        if (this.handlers.getCommonTokensForUserPairs !== undefined) {
            return this.handlers.getCommonTokensForUserPairs();
        }
        throw ErrorNotImplemented
    }

    getEnableSwapByUserConfig(): Promise<EnableSwapByUserConfig> {
        if (this.handlers.getEnableSwapByUserConfig !== undefined) {
            return this.handlers.getEnableSwapByUserConfig();
        }
        throw ErrorNotImplemented
    }

    getLastErrorMessage(): Promise<string> {
        if (this.handlers.getLastErrorMessage !== undefined) {
            return this.handlers.getLastErrorMessage();
        }
        throw ErrorNotImplemented
    }

    getOwner(): Promise<string> {
        if (this.handlers.getOwner !== undefined) {
            return this.handlers.getOwner();
        }
        throw ErrorNotImplemented
    }

    getPairCount(): Promise<number> {
        if (this.handlers.getPairCount !== undefined) {
            return this.handlers.getPairCount();
        }
        throw ErrorNotImplemented
    }

    getPairCreationEnabled(): Promise<boolean> {
        if (this.handlers.getPairCreationEnabled !== undefined) {
            return this.handlers.getPairCreationEnabled();
        }
        throw ErrorNotImplemented
    }

    getPairMetadata(pairAddress: string): Promise<PairMetadata> {
        if (this.handlers.getPairMetadata !== undefined) {
            return this.handlers.getPairMetadata(pairAddress);
        }
        throw ErrorNotImplemented
    }

    getPairTemplateAddress(): Promise<string> {
        if (this.handlers.getPairTemplateAddress !== undefined) {
            return this.handlers.getPairTemplateAddress();
        }
        throw ErrorNotImplemented
    }

    getPairsMetadata(): Promise<PairMetadata[]> {
        if (this.handlers.getPairsMetadata !== undefined) {
            return this.handlers.getPairsMetadata();
        }
        throw ErrorNotImplemented
    }

    getState(): Promise<boolean> {
        if (this.handlers.getState !== undefined) {
            return this.handlers.getState();
        }
        throw ErrorNotImplemented
    }

    getTemporaryOwnerPeriod(): Promise<string> {
        if (this.handlers.getTemporaryOwnerPeriod !== undefined) {
            return this.handlers.getTemporaryOwnerPeriod();
        }
        throw ErrorNotImplemented
    }

    getTotalFeesUSD(time: string): Promise<string> {
        if (this.handlers.getTotalFeesUSD !== undefined) {
            return this.handlers.getTotalFeesUSD(time);
        }
        throw ErrorNotImplemented
    }

    getTotalLockedValueUSD(): Promise<string> {
        if (this.handlers.getTotalLockedValueUSD !== undefined) {
            return this.handlers.getTotalLockedValueUSD();
        }
        throw ErrorNotImplemented
    }

    getTotalTxCount(): Promise<number> {
        if (this.handlers.getTotalTxCount !== undefined) {
            return this.handlers.getTotalTxCount();
        }
        throw ErrorNotImplemented
    }

    getTotalVolumeUSD(time: string): Promise<string> {
        if (this.handlers.getTotalVolumeUSD !== undefined) {
            return this.handlers.getTotalVolumeUSD(time);
        }
        throw ErrorNotImplemented
    }

    constructor(init: Partial<RouterGetterHandlers>) {
        this.handlers = new RouterGetterHandlers(init)
    }
}
