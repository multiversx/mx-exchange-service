import { Address } from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { PairInfoModel } from '../models/pair-info.model';
import { PairsData } from './pair.constants';

@Injectable()
export class PairGetterServiceMock {
    async getFirstTokenID(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).firstToken.identifier;
    }

    async getSecondTokenID(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).secondToken.identifier;
    }

    async getLpTokenID(pairAddress: string): Promise<string> {
        const pair = PairsData(pairAddress);
        if (pair && pair.liquidityPoolToken)
            return pair.liquidityPoolToken.identifier;
        return undefined;
    }

    async getFirstToken(pairAddress: string): Promise<EsdtToken> {
        return PairsData(pairAddress).firstToken;
    }

    async getSecondToken(pairAddress: string): Promise<EsdtToken> {
        return PairsData(pairAddress).secondToken;
    }

    async getLpToken(pairAddress: string): Promise<EsdtToken> {
        return PairsData(pairAddress).liquidityPoolToken;
    }

    async getTokenPrice(pairAddress: string, tokenID: string): Promise<string> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.getFirstTokenID(pairAddress),
            this.getSecondTokenID(pairAddress),
        ]);

        switch (tokenID) {
            case firstTokenID:
                return this.getFirstTokenPrice(pairAddress);
            case secondTokenID:
                return this.getSecondTokenPrice(pairAddress);
        }
    }

    async getFirstTokenPrice(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).firstTokenPrice;
    }

    async getSecondTokenPrice(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).secondTokenPrice;
    }

    async getTokenPriceUSD(tokenID: string): Promise<string> {
        switch (tokenID) {
            case 'TOK1-1111':
                return '200';
            case 'TOK2-2222':
                return '100';
            case 'USDC-1111':
                return '1';
        }
    }

    async getFirstTokenPriceUSD(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).firstTokenPriceUSD;
    }

    async getSecondTokenPriceUSD(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).secondTokenPriceUSD;
    }

    async getLpTokenPriceUSD(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).liquidityPoolTokenPriceUSD;
    }

    async getFirstTokenReserve(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).info.reserves0;
    }

    async getSecondTokenReserve(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).info.reserves1;
    }

    async getTotalSupply(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).info.totalSupply;
    }

    async getFirstTokenLockedValueUSD(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).firstTokenLockedValueUSD;
    }

    async getSecondTokenLockedValueUSD(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).secondTokenLockedValueUSD;
    }

    async getLockedValueUSD(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).lockedValueUSD;
    }

    async getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        const [
            firstTokenReserve,
            secondTokenReserve,
            totalSupply,
        ] = await Promise.all([
            this.getFirstTokenReserve(pairAddress),
            this.getSecondTokenReserve(pairAddress),
            this.getTotalSupply(pairAddress),
        ]);

        return new PairInfoModel({
            reserves0: firstTokenReserve,
            reserves1: secondTokenReserve,
            totalSupply: totalSupply,
        });
    }

    async getTotalFeePercent(pairAddress: string): Promise<number> {
        return PairsData(pairAddress).totalFeePercent;
    }

    async getFeesAPR(pairAddress: string): Promise<string> {
        return '10';
    }

    async getState(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).state;
    }

    async getInitialLiquidityAdder(pairAddress: string): Promise<string> {
        return 'erd173spamvzs8gv0ln4e4x605t7tucg892xgt2wmgw3pmrt43mwp3ys2lqp9x';
    }

    async getTrustedSwapPairs(pairAddress: string): Promise<string[]> {
        return [Address.Zero().bech32()];
    }
}
