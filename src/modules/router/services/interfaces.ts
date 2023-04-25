import { PairMetadata } from '../models/pair.metadata.model';
import { PairTokens } from '../../pair/models/pair.model';
import { EnableSwapByUserConfig } from '../models/factory.model';

export interface IRouterAbiService {
    pairsAddress(): Promise<string[]>;
    pairsMetadata(): Promise<PairMetadata[]>;
    pairCreationEnabled(): Promise<boolean>;
    lastErrorMessage(): Promise<string>;
    state(): Promise<boolean>;
    owner(): Promise<string>;
    allPairTokens(): Promise<PairTokens[]>;
    pairTemplateAddress(): Promise<string>;
    temporaryOwnerPeriod(): Promise<string>;
    enableSwapByUserConfig(): Promise<EnableSwapByUserConfig>;
    commonTokensForUserPairs(): Promise<string[]>;
}