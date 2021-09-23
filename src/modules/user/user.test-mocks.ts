import { EsdtToken } from '../../models/tokens/esdtToken.model';
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

    async getFarmTokenID(farmAddress: string): Promise<string> {
        return farmMetadata.farmTokenID;
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
