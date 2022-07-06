import {
    AssetsModel,
    EsdtToken,
    RolesModel,
} from 'src/modules/tokens/models/esdtToken.model';
import { FarmTokenAttributesModel } from '../models/farmTokenAttributes.model';

const farmMetadata = {
    address: 'farm_address_1',
    farmedTokenID: 'MEX-ec32fa',
    farmTokenID: 'FMT-1234',
    farmingTokenID: 'LPT-1111',
    farmTotalSupply: '1000000',
    farmingTokenReserve: '600000',
    rewardsPerBlock: '1',
};

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
        return new EsdtToken({
            identifier: 'LPT-1111',
            name: 'LiquidityPoolToken',
            ticker: 'LPT',
            type: 'FungibleESDT',
            owner: 'user_address_1',
            supply: '0',
            decimals: 18,
            isPaused: false,
            canUpgrade: true,
            canMint: true,
            canBurn: true,
            canChangeOwner: true,
            canPause: true,
            canFreeze: true,
            canWipe: true,
            minted: '1',
            burnt: '1',
            circulatingSupply: '1',
            accounts: 1,
            transactions: 1,
            assets: new AssetsModel({
                description: '',
                extraTokens: [],
                lockedAccounts: [],
                pngUrl: '',
                status: '',
                svgUrl: '',
                website: '',
            }),
            initialMinted: '1',
            price: '1',
            roles: new RolesModel(),
        });
    }

    async isFarmToken(tokenID: string): Promise<boolean> {
        return true;
    }

    async getFarmAddressByFarmTokenID(farmTokenID: string): Promise<string> {
        return farmMetadata.address;
    }

    decodeFarmTokenAttributes(
        farmAddress: string,
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
