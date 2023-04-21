import { PairMetadata } from '../models/pair.metadata.model';
import { pairs } from 'src/modules/pair/mocks/pair.constants';

export class RouterGetterServiceStub {
    async getAllPairsAddress(): Promise<string[]> {
        return pairs.map((p) => {
            return p.address;
        });
    }

    async getPairsMetadata(): Promise<PairMetadata[]> {
        return pairs.map((p) => {
            return new PairMetadata({
                firstTokenID: p.firstToken.identifier,
                secondTokenID: p.secondToken.identifier,
                address: p.address,
            });
        });
    }

    async getPairMetadata(pairAddress: string): Promise<PairMetadata> {
        const pairs = await this.getPairsMetadata();
        return pairs.find((pair) => pair.address === pairAddress);
    }
}

export const RouterGetterServiceProvider = {
    provide: 'RouterGetterService',
    useClass: RouterGetterServiceStub,
};
