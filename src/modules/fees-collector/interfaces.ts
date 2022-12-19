export interface IFeesCollectorGetterService {
    getAccumulatedFees(scAddress: string, week: number, token: string): Promise<string>;
    getAllTokens(scAddress: string): Promise<string[]>;
    getAccumulatedTokenForInflation(scAddress: string, week: number): Promise<string>;
    getLockedTokenId(scAddress: string): Promise<string>;
    getLockedTokensPerBlock(scAddress: string): Promise<string>;
}
