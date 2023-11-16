export interface ITokenComputeService {
    getEgldPriceInUSD(): Promise<string>;
    computeTokenPriceDerivedEGLD(
        tokenID: string,
        pairsNotToVisit: [],
    ): Promise<string>;
    computeTokenPriceDerivedUSD(tokenID: string): Promise<string>;
}
