import { ITokenComputeService } from "../interfaces";
import { ErrorNotImplemented } from "../../../utils/errors.constants";

export class TokenComputeHandlers implements ITokenComputeService {
    getEgldPriceInUSD:() => Promise<string>;
    computeTokenPriceDerivedEGLD:(tokenID: string) => Promise<string>;
    computeTokenPriceDerivedUSD:(tokenID: string) => Promise<string>;
    constructor(init: Partial<TokenComputeHandlers>) {
        Object.assign(this, init);
    }
}

export class TokenComputeServiceMock implements ITokenComputeService {
    handlers: TokenComputeHandlers;
    computeTokenPriceDerivedEGLD(tokenID: string): Promise<string> {
        if (this.handlers.computeTokenPriceDerivedEGLD !== undefined) {
            return this.handlers.computeTokenPriceDerivedEGLD(tokenID);
        }
        ErrorNotImplemented()
    }

    computeTokenPriceDerivedUSD(tokenID: string): Promise<string> {
        if (this.handlers.computeTokenPriceDerivedUSD !== undefined) {
            return this.handlers.computeTokenPriceDerivedUSD(tokenID);
        }
        ErrorNotImplemented()
    }

    getEgldPriceInUSD(): Promise<string> {
        if (this.handlers.getEgldPriceInUSD !== undefined) {
            return this.handlers.getEgldPriceInUSD();
        }
        ErrorNotImplemented()
    }

    constructor(init: Partial<TokenComputeHandlers>) {
        this.handlers = new TokenComputeHandlers(init);
    }
}