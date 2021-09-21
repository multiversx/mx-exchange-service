import { EsdtToken } from '../../models/tokens/esdtToken.model';
import BigNumber from 'bignumber.js';
import { FarmTokenAttributesModel } from '../farm/models/farmTokenAttributes.model';
import { pairsMetadata } from '../../services/context/context.service.mocks';

const farmMetadata = {
    address: 'farm_address_1',
    farmedTokenID: 'MEX-ec32fa',
    farmTokenID: 'FMT-1234',
    farmingTokenID: 'LPT-1111',
    farmTotalSupply: '1000000',
    farmingTokenReserve: '600000',
    rewardsPerBlock: '1',
};

export class ContextServiceMock {
    async getAllPairsAddress(): Promise<string[]> {
        const pairsAddress = [];
        for (const pair of pairsMetadata) {
            pairsAddress.push(pair.address);
        }
        return pairsAddress;
    }
}

export class FarmServiceMock {
    async getFarmingTokenID(farmAddress: string): Promise<string> {
        return farmMetadata.farmingTokenID;
    }

    async getFarmedTokenID(farmAddress: string): Promise<string> {
        return farmMetadata.farmedTokenID;
    }

    async getFarmingToken(farmAddress: string): Promise<EsdtToken> {
        return {
            identifier: 'LPT-1111',
            name: 'LiquidityPoolToken',
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

    async isFarmToken(tokenID: string): Promise<boolean> {
        return true;
    }

    async getFarmAddressByFarmTokenID(farmTokenID: string): Promise<string> {
        return farmMetadata.address;
    }

    decodeFarmTokenAttributes(
        identifier: string,
        attributes: string,
    ): FarmTokenAttributesModel {
        return new FarmTokenAttributesModel({
            identifier: identifier,
            attributes: attributes,
            originalEnteringEpoch: 1,
            enteringEpoch: 1,
            aprMultiplier: 1,
            lockedRewards: false,
            rewardPerShare: '3000',
            initialFarmingAmount: '100',
            compoundedReward: '10',
            currentFarmAmount: '100',
        });
    }

    async getFarmTokenPriceUSD(farmAddress: string): Promise<string> {
        return '200';
    }
}

export class PairServiceMock {
    async getLpToken(pairAddress: string): Promise<EsdtToken> {
        return {
            identifier: 'LPT-1111',
            name: 'LiquidityPoolToken',
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

    async getLpTokenPriceUSD(pairAddress): Promise<string> {
        return '200';
    }

    async getPairAddressByLpTokenID(tokenID: string): Promise<string> {
        if (tokenID === 'LPT-1111') {
            return 'erd1qqqqqqqqqqqqqpgqyt7u9afy0d9yp70rlg7znsp0u0j8zxq60n4ser3kww';
        }
        return;
    }

    async getPriceUSDByPath(tokenID: string): Promise<BigNumber> {
        return new BigNumber('100');
    }

    async isPairEsdtToken(tokenID: string): Promise<boolean> {
        return true;
    }
}

export class PriceFeedServiceMock {}

export class ProxyServiceMock {}

export class ProxyPairServiceMock {
    async getwrappedLpTokenID(): Promise<string> {
        return 'LKLP-1111';
    }
}

export class ProxyFarmServiceMock {
    async getwrappedFarmTokenID(): Promise<string> {
        return 'LKFARM-1111';
    }
}

export class LockedAssetMock {
    async getLockedTokenID(): Promise<string> {
        return 'LKMEX-1111';
    }
}
