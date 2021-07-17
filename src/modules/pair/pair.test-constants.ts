import { PairInfoModel } from './models/pair-info.model';
import { EsdtToken } from '../../models/tokens/esdtToken.model';
import BigNumber from 'bignumber.js';

interface PairMetadata {
    address: string;
    firstToken: string;
    secondToken: string;
}

const pairsMetadata = [
    {
        firstToken: 'WEGLD-88600a',
        secondToken: 'MEX-b6bb7d',
        address: 'pair_address_1',
    },
    {
        firstToken: 'WEGLD-88600a',
        secondToken: 'BUSD-05b16f',
        address: 'pair_address_2',
    },
    {
        firstToken: 'MEX-b6bb7d',
        secondToken: 'BUSD-05b16f',
        address: 'pair_address_3',
    },
    {
        firstToken: 'MEX-b6bb7d',
        secondToken: 'SPT-f66742',
        address: 'pair_address_4',
    },
];

export class AbiPairServiceMock {
    async getFirstTokenID(pairAddress: string): Promise<string> {
        let firstTokenID = '';
        for (const pair of pairsMetadata) {
            if (pair.address === pairAddress) {
                firstTokenID = pair.firstToken;
                return firstTokenID;
            }
        }

        return firstTokenID;
    }

    async getSecondTokenID(pairAddress: string): Promise<string> {
        let secondTokenID = '';
        for (const pair of pairsMetadata) {
            if (pair.address === pairAddress) {
                secondTokenID = pair.secondToken;
                return secondTokenID;
            }
        }

        return secondTokenID;
    }

    async getLpTokenID(pairAddress: string): Promise<string> {
        return 'LPT-1111';
    }

    async getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        if (pairAddress === 'pair_address_4') {
            return {
                reserves0: '100000000000000000000',
                reserves1: '300000000000000000000',
                totalSupply: '100000000000000000000',
            };
        }
        return {
            reserves0: '100000000000000000000',
            reserves1: '200000000000000000000',
            totalSupply: '100000000000000000000',
        };
    }

    async getTemporaryFunds(
        pairAddress: string,
        callerAddress: string,
        tokenID: string,
    ): Promise<BigNumber> {
        return new BigNumber(100);
    }
}

export class ContextServiceMock {
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

    async getPairByTokens(
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<PairMetadata> {
        for (const pair of pairsMetadata) {
            if (
                (pair.firstToken === firstTokenID &&
                    pair.secondToken === secondTokenID) ||
                (pair.firstToken === secondTokenID &&
                    pair.secondToken === firstTokenID)
            ) {
                return pair;
            }
        }
        return;
    }

    async getPairsMap(): Promise<Map<string, string[]>> {
        const pairsMap: Map<string, string[]> = new Map();
        pairsMap.set('WEGLD-88600a', ['MEX-b6bb7d', 'BUSD-05b16f']);
        pairsMap.set('MEX-b6bb7d', [
            'WEGLD-88600a',
            'BUSD-05b16f',
            'SPT-f66742',
        ]);
        pairsMap.set('BUSD-05b16f', ['WEGLD-88600a', 'MEX-b6bb7d']);
        pairsMap.set('SPT-f66742', ['MEX-b6bb7d']);

        return pairsMap;
    }

    async getPath(input: string, output: string): Promise<string[]> {
        const path = [input];
        const queue = [input];
        const visited = new Map<string, boolean>();

        const pairsMap = await this.getPairsMap();

        for (const key of pairsMap.keys()) {
            visited.set(key, false);
        }

        visited.set(input, true);
        while (queue.length > 0) {
            const node = queue.shift();
            for (const value of pairsMap.get(node)) {
                if (value === output) {
                    path.push(output);
                    return path;
                }

                if (!visited.get(value)) {
                    visited.set(value, true);
                    queue.push(value);
                    path.push(value);
                }
            }
        }

        return [];
    }
}

export class CachePairServiceMock {
    async getFirstTokenID(pairAddress: string): Promise<Record<string, any>> {
        return;
    }

    async setFirstTokenID(
        pairAddress: string,
        tokenID: Record<string, any>,
    ): Promise<void> {
        return;
    }

    async getSecondTokenID(pairAddress: string): Promise<Record<string, any>> {
        return;
    }

    async setSecondTokenID(
        pairAddress: string,
        tokenID: Record<string, any>,
    ): Promise<void> {
        return;
    }

    async getLpTokenID(pairAddress: string): Promise<Record<string, any>> {
        return;
    }

    async setLpTokenID(
        pairAddress: string,
        tokenID: Record<string, any>,
    ): Promise<void> {
        return;
    }

    async getReserves(
        pairAddress: string,
        tokenID: string,
    ): Promise<Record<string, any>> {
        return;
    }

    async setReserves(
        pairAddress: string,
        tokenID: string,
        reserves: Record<string, any>,
    ): Promise<void> {
        return;
    }

    async getTotalSupply(pairAddress: string): Promise<Record<string, any>> {
        return;
    }

    async setTotalSupply(
        pairAddress: string,
        tokenID: Record<string, any>,
    ): Promise<void> {
        return;
    }

    async getTemporaryFunds(
        pairAddress: string,
        callerAddress: string,
        tokenID: string,
    ) {
        return;
    }

    async setTemporaryFunds(
        pairAddress: string,
        callerAddress: string,
        tokenID: Record<string, any>,
    ) {
        return;
    }
}

export class RedlockServiceMock {}

export class PriceFeedServiceMock {
    async getTokenPrice(token: string): Promise<number> {
        return 100;
    }
}

export class WrapServiceMock {
    async getWrappedEgldTokenID(): Promise<string> {
        return 'WEGLD-1111';
    }
}
