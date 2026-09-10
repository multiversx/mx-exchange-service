import { PriceContext } from './models/price.context';

export interface ITokenComputeService {
    getEgldPriceInUSD(): Promise<string>;
    computeTokenPriceDerivedEGLD(
        tokenID: string,
        pairsNotToVisit: [],
    ): Promise<string>;
    computeDerivedEGLDInContext(
        tokenID: string,
        context?: PriceContext,
    ): Promise<string>;
    computeTokenPriceDerivedUSD(
        tokenID: string,
        context?: PriceContext,
    ): Promise<string>;
}
