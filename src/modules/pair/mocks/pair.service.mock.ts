import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { PairsData } from './pair.constants';
import { PairService } from '../services/pair.service';

export class PairServiceMock {
    async getFirstToken(pairAddress: string): Promise<EsdtToken> {
        return PairsData(pairAddress).firstToken;
    }
    async getSecondToken(pairAddress: string): Promise<EsdtToken> {
        return PairsData(pairAddress).secondToken;
    }
}

export const PairServiceProvider = {
    provide: PairService,
    useClass: PairServiceMock,
};
