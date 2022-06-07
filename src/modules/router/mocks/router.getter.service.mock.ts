import { PairMetadata } from '../models/pair.metadata.model';

export class RouterGetterServiceMock {
    async getAllPairsAddress(): Promise<string[]> {
        return [
            'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
            'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
            'erd1sea63y47u569ns3x5mqjf4vnygn9whkk7p6ry4rfpqyd6rd5addqyd9lf2',
        ];
    }

    async getPairsMetadata(): Promise<PairMetadata[]> {
        return [
            new PairMetadata({
                address:
                    'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                firstTokenID: 'TOK1-1111',
                secondTokenID: 'TOK2-2222',
            }),
            new PairMetadata({
                address:
                    'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                firstTokenID: 'TOK1-1111',
                secondTokenID: 'USDC-1111',
            }),
            new PairMetadata({
                address:
                    'erd1sea63y47u569ns3x5mqjf4vnygn9whkk7p6ry4rfpqyd6rd5addqyd9lf2',
                firstTokenID: 'TOK3-3333',
                secondTokenID: 'USDC-1111',
            }),
        ];
    }
}
