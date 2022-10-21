export interface ITokenComputeService {
    getEgldPriceInUSD(): Promise<string>;
    computeTokenPriceDerivedEGLD(tokenID: string): Promise<string>;
    computeTokenPriceDerivedUSD(tokenID: string): Promise<string>;
}