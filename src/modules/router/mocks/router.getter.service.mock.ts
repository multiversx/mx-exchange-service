import { PairMetadata } from '../models/pair.metadata.model';

export class RouterGetterServiceMock {
    async getAllPairsAddress(): Promise<string[]> {
        return ['pair_address_1', 'pair_address_2'];
    }

    async getPairsMetadata(): Promise<PairMetadata[]> {
        return [
            new PairMetadata({
                address: 'pair_address_1',
                firstTokenID: 'TOK1-1111',
                secondTokenID: 'TOK2-2222',
            }),
            new PairMetadata({
                address: 'pair_address_2',
                firstTokenID: 'TOK1-1111',
                secondTokenID: 'TOK3-3333',
            }),
        ];
    }
}
