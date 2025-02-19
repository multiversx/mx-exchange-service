import { PairTokens } from 'src/modules/pair/models/pair.model';
import { EnableSwapByUserConfig } from '../models/factory.model';
import { PairMetadata } from '../models/pair.metadata.model';
import { IRouterAbiService } from '../services/interfaces';
import { pairs } from 'src/modules/pair/mocks/pair.constants';
import { RouterAbiService } from '../services/router.abi.service';
import { SimpleLockModel } from 'src/modules/simple-lock/models/simple.lock.model';
import { Address } from '@multiversx/sdk-core/out';

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
    async enableSwapByUserConfig(): Promise<EnableSwapByUserConfig> {
        return new EnableSwapByUserConfig({
            lockingSC: new SimpleLockModel({
                address: Address.Zero().bech32(),
            }),
            commonTokenID: 'USDC-123456',
            lockedTokenID: 'LKESDT-123456',
            minLockedTokenValue: '8000000000',
            minLockPeriodEpochs: 1,
        });
    }
    async commonTokensForUserPairs(): Promise<string[]> {
        return ['USDC-123456', 'WEGLD-123456'];
    }
}

export const RouterAbiServiceProvider = {
    provide: RouterAbiService,
    useClass: RouterAbiServiceMock,
};
