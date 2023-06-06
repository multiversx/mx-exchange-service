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
            case 'TOK1-1111':
                return '200';
            case 'TOK2-2222':
                return '100';
            case 'USDC-1111':
                return '1';
            case 'TOK4-4444':
                return '10';
            case 'TOK1TOK4LPStaked':
                return '15';
            case 'TOK1TOK4LP':
                return '50';
            case 'TOK1TOK2LPStaked':
                return '100;';
            case 'TOK1TOK2LP':
                return '2';
        }
    }
    async firstTokenPriceUSD(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).firstTokenPriceUSD;
    }
    async secondTokenPriceUSD(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).secondTokenPriceUSD;
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
    firstTokenVolume(pairAddress: string, time: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    secondTokenVolume(pairAddress: string, time: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    volumeUSD(pairAddress: string, time: string): Promise<string> {
        throw new Error('Method not implemented.');
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
}

export const PairComputeServiceProvider = {
    provide: PairComputeService,
    useClass: PairComputeServiceMock,
};
