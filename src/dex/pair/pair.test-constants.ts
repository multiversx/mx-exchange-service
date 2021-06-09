import { PairInfoModel } from '../models/pair-info.model';
import { TokenModel } from '../models/esdtToken.model';

interface PairMetadata {
    address: string;
    firstToken: string;
    secondToken: string;
}

const pairsMetadata = [
    {
        firstToken: 'WXEGLD-da3f24',
        secondToken: 'MEX-531623',
        address: 'pair_address_1',
    },
    {
        firstToken: 'WXEGLD-da3f24',
        secondToken: 'BUSD-f66742',
        address: 'pair_address_2',
    },
    {
        firstToken: 'MEX-531623',
        secondToken: 'BUSD-f66742',
        address: 'pair_address_3',
    },
    {
        firstToken: 'MEX-531623',
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
        return {
            reserves0: '100000000000000000000',
            reserves1: '100000000000000000000',
            totalSupply: '100000000000000000000',
        };
    }

    async getTemporaryFunds(
        pairAddress: string,
        callerAddress: string,
        tokenID: string,
    ): Promise<string> {
        return '100';
    }
}

export class ContextServiceMock {
    async getPairsMetadata(): Promise<PairMetadata[]> {
        return pairsMetadata;
    }

    async getTokenMetadata(tokenID: string): Promise<TokenModel> {
        return {
            token: tokenID,
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

    async getPairsMap(): Promise<Map<string, Map<string, number>>> {
        const pairsMap = new Map<string, Map<string, number>>();
        pairsMetadata.forEach(pair => {
            if (pairsMap.has(pair.firstToken)) {
                pairsMap.get(pair.firstToken).set(pair.secondToken, 1);
            } else {
                pairsMap.set(pair.firstToken, new Map());
                pairsMap.get(pair.firstToken).set(pair.secondToken, 1);
            }
            if (pairsMap.has(pair.secondToken)) {
                pairsMap.get(pair.secondToken).set(pair.firstToken, 1);
            } else {
                pairsMap.set(pair.secondToken, new Map());
                pairsMap.get(pair.secondToken).set(pair.firstToken, 1);
            }
        });

        return pairsMap;
    }

    async getPath(input: string, output: string): Promise<string[]> {
        const path: string[] = [input];
        const queue: string[] = [];
        const visited = new Map<string, boolean>();
        visited.set(input, true);
        queue.push(input);

        const pairsMap = await this.getPairsMap();
        pairsMap.forEach((value, key, map) => visited.set(key, false));

        while (queue.length !== 0) {
            const node = queue.shift();
            for (const [key, value] of pairsMap.get(node)) {
                if (key === output) {
                    path.push(output);
                    return path;
                }
                if (!visited.get(key)) {
                    visited.set(key, true);
                    queue.push(key);
                    path.push(key);
                }
            }
        }

        return path;
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
