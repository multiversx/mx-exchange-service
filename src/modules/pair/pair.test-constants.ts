import { PairInfoModel } from './models/pair-info.model';
import BigNumber from 'bignumber.js';
import { pairsMetadata } from '../../services/context/context.service.mocks';

export class AbiPairServiceMock {
    async getFirstTokenID(pairAddress: string): Promise<string> {
        let firstTokenID = '';

        for (const pair of pairsMetadata) {
            if (pair.address === pairAddress) {
                firstTokenID = pair.firstTokenID;
                return firstTokenID;
            }
        }

        return firstTokenID;
    }

    async getSecondTokenID(pairAddress: string): Promise<string> {
        let secondTokenID = '';
        for (const pair of pairsMetadata) {
            if (pair.address === pairAddress) {
                secondTokenID = pair.secondTokenID;
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
