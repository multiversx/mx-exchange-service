import BigNumber from 'bignumber.js';
import { IPairComputeService } from '../interfaces';
import { PairAbiService } from '../services/pair.abi.service';
import { PairComputeService } from '../services/pair.compute.service';
import { PairsData } from './pair.constants';

export class PairComputeServiceMock implements IPairComputeService {
    constructor(private readonly pairAbi: PairAbiService) {}

    async getTokenPrice(pairAddress: string, tokenID: string): Promise<string> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairAbi.firstTokenID(pairAddress),
            this.pairAbi.secondTokenID(pairAddress),
        ]);

        switch (tokenID) {
            case firstTokenID:
                return this.firstTokenPrice(pairAddress);
            case secondTokenID:
                return this.secondTokenPrice(pairAddress);
        }
    }
    async firstTokenPrice(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).firstTokenPrice;
    }
    async secondTokenPrice(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).secondTokenPrice;
    }
    async lpTokenPriceUSD(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).liquidityPoolTokenPriceUSD;
    }
    async tokenPriceUSD(tokenID: string): Promise<string> {
        switch (tokenID) {
            case 'WEGLD-123456':
                return '10';
            case 'MEX-123456':
                return '0.01';
            case 'USDC-123456':
                return '1';
            case 'TOK4-123456':
                return '0.1';
            case 'EGLDTOK4FL-abcdef':
                return '15';
            case 'EGLDTOK4LP-abcdef':
                return '50';
            case 'EGLDMEXFL-abcdef':
                return '100;';
            case 'EGLDMEXLP-abcdef':
                return '2';
        }
    }
    async firstTokenPriceUSD(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).firstTokenPriceUSD;
    }
    async secondTokenPriceUSD(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).secondTokenPriceUSD;
    }
    async getAllFirstTokensPriceUSD(
        pairAddresses: string[],
    ): Promise<string[]> {
        return pairAddresses.map(
            (pairAddress) => PairsData(pairAddress).firstTokenPriceUSD,
        );
    }
    async getAllSecondTokensPricesUSD(
        pairAddresses: string[],
    ): Promise<string[]> {
        return pairAddresses.map(
            (pairAddress) => PairsData(pairAddress).secondTokenPriceUSD,
        );
    }
    async firstTokenLockedValueUSD(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).firstTokenLockedValueUSD;
    }
    async secondTokenLockedValueUSD(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).secondTokenLockedValueUSD;
    }
    async lockedValueUSD(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).lockedValueUSD;
    }
    firstTokenVolume(pairAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    secondTokenVolume(pairAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async volumeUSD(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).volumeUSD;
    }
    async getAllVolumeUSD(pairAddresses: string[]): Promise<string[]> {
        return pairAddresses.map((address) => PairsData(address).volumeUSD);
    }
    feesUSD(pairAddress: string, time: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async feesAPR(pairAddress: string): Promise<string> {
        return '10';
    }
    type(pairAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }

    async computeLpTokenPriceUSD(pairAddress: string): Promise<string> {
        return await this.lpTokenPriceUSD(pairAddress);
    }

    async computePermanentLockedValueUSD(
        pairAddress: string,
    ): Promise<BigNumber> {
        return new BigNumber('0.000001');
    }

    async tradesCount(pairAddress: string): Promise<number> {
        return PairsData(pairAddress).tradesCount;
    }

    async hasFarms(pairAddress: string): Promise<boolean> {
        return PairsData(pairAddress).hasFarms;
    }

    async hasDualFarms(pairAddress: string): Promise<boolean> {
        return PairsData(pairAddress).hasDualFarms;
    }
}

export const PairComputeServiceProvider = {
    provide: PairComputeService,
    useClass: PairComputeServiceMock,
};
