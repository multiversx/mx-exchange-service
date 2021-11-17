import { PairMetadata } from '../../../modules/router/models/pair.metadata.model';

export const pairsMetadata: PairMetadata[] = [
    {
        firstTokenID: 'TOK1-1111',
        secondTokenID: 'TOK2-2222',
        address: 'pair_address_1',
    },
    {
        firstTokenID: 'TOK1-1111',
        secondTokenID: 'TOK3-3333',
        address: 'pair_address_2',
    },
];

export class ContextServiceMock {
    async getAllPairsAddress(): Promise<string[]> {
        const pairsAddress = [];
        for (const pair of pairsMetadata) {
            pairsAddress.push(pair.address);
        }
        return pairsAddress;
    }

    async getPairsMetadata(): Promise<PairMetadata[]> {
        return pairsMetadata;
    }

    async getPairByTokens(
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<PairMetadata> {
        for (const pair of pairsMetadata) {
            if (
                (pair.firstTokenID === firstTokenID &&
                    pair.secondTokenID === secondTokenID) ||
                (pair.firstTokenID === secondTokenID &&
                    pair.secondTokenID === firstTokenID)
            ) {
                return pair;
            }
        }
        return;
    }

    async getPairsMap(): Promise<Map<string, string[]>> {
        const pairsMap: Map<string, string[]> = new Map();
        pairsMap.set('TOK1-1111', ['TOK2-2222', 'TOK3-3333']);
        pairsMap.set('TOK2-2222', ['TOK1-1111']);
        pairsMap.set('TOK3-3333', ['TOK1-1111']);

        return pairsMap;
    }

    isConnected(
        graph: Map<string, string[]>,
        input: string,
        output: string,
        discovered: Map<string, boolean>,
        path: string[] = [],
    ): boolean {
        discovered.set(input, true);
        path.push(input);
        if (input === output) {
            return true;
        }

        for (const vertex of graph.get(input)) {
            if (!discovered.get(vertex)) {
                if (this.isConnected(graph, vertex, output, discovered, path)) {
                    return true;
                }
            }
        }

        path.pop();
        return false;
    }
}
