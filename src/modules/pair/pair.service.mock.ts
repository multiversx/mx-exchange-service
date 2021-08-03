import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { PairInfoModel } from './models/pair-info.model';

export class PairServiceMock {
    async getFirstTokenID(pairAddress: string): Promise<string> {
        return 'WEGLD-88600a';
    }
    async getSecondTokenID(pairAddress: string): Promise<string> {
        return 'MEX-b6bb7d';
    }

    async getFirstToken(pairAddress: string): Promise<EsdtToken> {
        return {
            identifier: 'WEGLD-88600a',
            name: 'WEGLD-88600a',
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

    async getSecondToken(pairAddress: string): Promise<EsdtToken> {
        return {
            identifier: 'MEX-b6bb7d',
            name: 'MEX-b6bb7d',
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

    async getFirstTokenPriceUSD(pairAddress: string): Promise<string> {
        return '100';
    }

    async getSecondTokenPriceUSD(pairAddress: string): Promise<string> {
        return '0.1';
    }

    async getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        return new PairInfoModel({
            reserves0: '5',
            reserves1: '5000',
            totalSupply: '50',
        });
    }
}
