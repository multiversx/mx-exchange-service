export interface IFeesCollectorAbiService {
    accumulatedFees(week: number, token: string): Promise<string>;
    lockedTokensPerEpoch(): Promise<string>;
    allTokens(): Promise<string[]>;
}
