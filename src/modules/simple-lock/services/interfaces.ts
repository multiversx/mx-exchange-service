export interface ISimpleLockAbiService {
    lockedTokenID(simpleLockAddress: string): Promise<string>;
    lpProxyTokenID(simpleLockAddress: string): Promise<string>;
    farmProxyTokenID(simpleLockAddress: string): Promise<string>;
    intermediatedPairs(simpleLockAddress: string): Promise<string[]>;
    intermediatedFarms(simpleLockAddress: string): Promise<string[]>;
}
