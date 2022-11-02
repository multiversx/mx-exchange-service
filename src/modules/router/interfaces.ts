import { PairMetadata } from "./models/pair.metadata.model";
import { PairTokens } from "../pair/models/pair.model";
import { EnableSwapByUserConfig } from "./models/factory.model";

export interface IRouterGetterService {
    getAllPairsAddress(): Promise<string[]>;
    getPairsMetadata(): Promise<PairMetadata[]>;
    getPairMetadata(pairAddress: string): Promise<PairMetadata>;
    getEnableSwapByUserConfig(): Promise<EnableSwapByUserConfig>;
    getCommonTokensForUserPairs(): Promise<string[]>;
    getTotalLockedValueUSD(): Promise<string>;
    getTotalVolumeUSD(time: string): Promise<string>;
    getTotalFeesUSD(time: string): Promise<string>;
    getPairCount(): Promise<number>;
    getTotalTxCount(): Promise<number>;
    getPairCreationEnabled(): Promise<boolean>;
    getLastErrorMessage(): Promise<string>;
    getState(): Promise<boolean>;
    getOwner(): Promise<string>;
    getAllPairsManagedAddresses(): Promise<string[]>;
    getAllPairTokens(): Promise<PairTokens[]>;
    getPairTemplateAddress(): Promise<string>;
    getTemporaryOwnerPeriod(): Promise<string>;
}
