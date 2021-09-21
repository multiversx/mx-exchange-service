import BigNumber from 'bignumber.js';
import { EsdtToken } from '../../models/tokens/esdtToken.model';
import { pairsMetadata } from '../../services/context/context.service.mocks';
import { PairInfoModel } from './models/pair-info.model';

export class PairServiceMock {
    async getFirstTokenID(pairAddress: string): Promise<string> {
        return 'WEGLD-073650';
    }
    async getSecondTokenID(pairAddress: string): Promise<string> {
        return 'MEX-ec32fa';
    }

    async getLpTokenID(pairAddress: string): Promise<string> {
        return 'LPT-1111';
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

    async getLpTokenPriceUSD(pairAddress: string): Promise<string> {
        return '10';
    }

    async getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        return new PairInfoModel({
            reserves0: '5',
            reserves1: '5000',
            totalSupply: '50',
        });
    }

    async computeTokenPriceUSD(tokenID: string): Promise<BigNumber> {
        return new BigNumber(100);
    }

    async getPairAddressByLpTokenID(tokenID: string): Promise<string | null> {
        if (tokenID === 'LPT-1111') {
            return pairsMetadata[0].address;
        }
        return;
    }

    async isPairEsdtToken(tokenID: string): Promise<boolean> {
        const pairsAddress = pairsMetadata.map(pair => pair.address);
        for (const pairAddress of pairsAddress) {
            const [firstTokenID, secondTokenID, lpTokenID] = await Promise.all([
                this.getFirstTokenID(pairAddress),
                this.getSecondTokenID(pairAddress),
                this.getLpTokenID(pairAddress),
            ]);

            if (
                tokenID === firstTokenID ||
                tokenID === secondTokenID ||
                tokenID === lpTokenID
            ) {
                return true;
            }
        }
        return false;
    }
}
