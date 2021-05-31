import { BigNumber } from 'bignumber.js';
import { PairInfoModel } from '../models/pair-info.model';
import { TokenModel } from '../models/pair.model';

interface PairMetadata {
    address: string;
    firstToken: string;
    secondToken: string;
}

const pairsMetadata = [
    {
        firstToken: 'WEGLD-ccae2d',
        secondToken: 'MEX-115f3c',
        address: 'pair_address_1',
    },
    {
        firstToken: 'WEGLD-ccae2d',
        secondToken: 'BUSD-f66742',
        address: 'pair_address_2',
    },
    {
        firstToken: 'MEX-115f3c',
        secondToken: 'BUSD-f66742',
        address: 'pair_address_3',
    },
    {
        firstToken: 'MEX-115f3c',
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
}

export class ContextServiceMock {
    async getTokenMetadata(tokenID: string): Promise<TokenModel> {
        return {
            name: tokenID,
            token: tokenID,
            decimals: 18,
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

    public toBigNumber(value: string, token: TokenModel): BigNumber {
        const bigNumber = new BigNumber(value);
        const exponent = new BigNumber(`1e+${token.decimals}`);
        return bigNumber.multipliedBy(exponent);
    }

    public fromBigNumber(value: string, token: TokenModel): BigNumber {
        const bigNumber = new BigNumber(value);
        const exponent = new BigNumber(`1e-${token.decimals}`);
        return bigNumber.multipliedBy(exponent);
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
}

export class RedlockServiceMock {}

export class PriceFeedServiceMock {
    async getTokenPrice(token: string): Promise<number> {
        return 100;
    }
}
