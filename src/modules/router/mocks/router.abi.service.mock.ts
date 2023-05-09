import { PairTokens } from 'src/modules/pair/models/pair.model';
import { EnableSwapByUserConfig } from '../models/factory.model';
import { PairMetadata } from '../models/pair.metadata.model';
import { IRouterAbiService } from '../services/interfaces';
import { pairs } from 'src/modules/pair/mocks/pair.constants';
import { RouterAbiService } from '../services/router.abi.service';

export class RouterAbiServiceMock implements IRouterAbiService {
    async pairsAddress(): Promise<string[]> {
        return pairs.map((p) => {
            return p.address;
        });
    }
    async pairsMetadata(): Promise<PairMetadata[]> {
        return pairs.map((p) => {
            return new PairMetadata({
                firstTokenID: p.firstToken.identifier,
                secondTokenID: p.secondToken.identifier,
                address: p.address,
            });
        });
    }
    pairCreationEnabled(): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    lastErrorMessage(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    state(): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    owner(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    allPairTokens(): Promise<PairTokens[]> {
        throw new Error('Method not implemented.');
    }
    pairTemplateAddress(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    temporaryOwnerPeriod(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    enableSwapByUserConfig(): Promise<EnableSwapByUserConfig> {
        throw new Error('Method not implemented.');
    }
    commonTokensForUserPairs(): Promise<string[]> {
        throw new Error('Method not implemented.');
    }
}

export const RouterAbiServiceProvider = {
    provide: RouterAbiService,
    useClass: RouterAbiServiceMock,
};
