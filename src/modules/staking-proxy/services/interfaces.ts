export interface IStakingProxyAbiService {
    lpFarmAddress(stakingProxyAddress: string): Promise<string>;
    stakingFarmAddress(stakingProxyAddress: string): Promise<string>;
    pairAddress(stakingProxyAddress: string): Promise<string>;
    stakingTokenID(stakingProxyAddress: string): Promise<string>;
    farmTokenID(stakingProxyAddress: string): Promise<string>;
    dualYieldTokenID(stakingProxyAddress: string): Promise<string>;
    lpFarmTokenID(stakingProxyAddress: string): Promise<string>;
}
