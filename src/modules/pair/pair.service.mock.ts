import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { PairInfoModel } from './models/pair-info.model';

export class PairServiceMock {
    async getFirstTokenID(pairAddress: string): Promise<string> {
        return 'WEGLD-073650';
    }
    async getSecondTokenID(pairAddress: string): Promise<string> {
        return 'MEX-ec32fa';
    }

    async getFirstToken(pairAddress: string): Promise<EsdtToken> {
        return {
            identifier: 'WEGLD-073650',
            name: 'WEGLD-073650',
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
            identifier: 'MEX-ec32fa',
            name: 'MEX-ec32fa',
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
