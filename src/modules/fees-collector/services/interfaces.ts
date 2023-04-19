export interface IFeesCollectorAbiService {
    accumulatedFees(week: number, token: string): Promise<string>;
    lockedTokenID(): Promise<string>;
    lockedTokensPerBlock(): Promise<string>;
    allTokens(): Promise<string[]>;
}
