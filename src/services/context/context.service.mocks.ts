import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';

const pairsMetadata: PairMetadata[] = [
    {
        firstTokenID: 'WEGLD-88600a',
        secondTokenID: 'MEX-b6bb7d',
        address:
            'erd1qqqqqqqqqqqqqpgqyt7u9afy0d9yp70rlg7znsp0u0j8zxq60n4ser3kww',
    },
    {
        firstTokenID: 'WEGLD-88600a',
        secondTokenID: 'BUSD-f66742',
        address:
            'erd1qqqqqqqqqqqqqpgq3gmttefd840klya8smn7zeae402w2esw0n4sm8m04f',
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

    async getTokenMetadata(tokenID: string): Promise<EsdtToken> {
        return {
            identifier: tokenID,
            name: tokenID,
            type: 'FungibleESDT',
            owner: 'user_address_1',
            minted: '0',
            burnt: '0',
            decimals: 18,
            isPaused: false,
            canUpgrade: true,
            canMint: true,
            canBurn: true,
            canChangeOwner: true,
            canPause: true,
            canFreeze: true,
            canWipe: true,
        };
    }
}
