import { Injectable } from '@nestjs/common';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
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
        return PairsData(pairAddress).liquidityPoolToken.identifier;
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

    async getTokenPriceUSD(
        pairAddress: string,
        tokenID: string,
    ): Promise<string> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.getFirstTokenID(pairAddress),
            this.getSecondTokenID(pairAddress),
        ]);

        switch (tokenID) {
            case firstTokenID:
                return this.getFirstTokenPriceUSD(pairAddress);
            case secondTokenID:
                return this.getSecondTokenPriceUSD(pairAddress);
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

    async getState(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).state;
    }
}
