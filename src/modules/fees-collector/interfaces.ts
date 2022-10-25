export interface IFeesCollectorGetterService {
    getAccumulatedFees(scAddress: string, week: number, token: string): Promise<string>;
    getAllTokens(scAddress: string): Promise<string[]>;
}