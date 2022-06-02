import { PairMetadata } from '../models/pair.metadata.model';
import { pairs } from 'src/modules/pair/mocks/pair.constants';
export class RouterGetterServiceMock {
    async getAllPairsAddress(): Promise<string[]> {
        return pairs.map(p => {
            return p.address;
        });
    }

    async getPairsMetadata(): Promise<PairMetadata[]> {
        return pairs.map(p => {
            return new PairMetadata({
                firstTokenID: p.firstToken.identifier,
                secondTokenID: p.secondToken.identifier,
                address: p.address,
            });
        });
    }
}
