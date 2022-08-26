import { PairMetadata } from '../../../modules/router/models/pair.metadata.model';

export const pairsMetadata: PairMetadata[] = [
    {
        firstTokenID: 'TOK1-1111',
        secondTokenID: 'TOK2-2222',
        address:
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
    },
    {
        firstTokenID: 'TOK1-1111',
        secondTokenID: 'USDC-1111',
        address:
            'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
    },
];

export class ContextServiceMock {
    async getPairsMetadata(): Promise<PairMetadata[]> {
        return pairsMetadata;
    }

    async getPairMetadata(pairAddress: string): Promise<PairMetadata> {
        const pairs = await this.getPairsMetadata();
        return pairs.find(pair => pair.address === pairAddress);
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
        pairsMap.set('TOK1-1111', ['TOK2-2222', 'USDC-1111']);
        pairsMap.set('TOK2-2222', ['TOK1-1111']);
        pairsMap.set('USDC-1111', ['TOK1-1111']);

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
