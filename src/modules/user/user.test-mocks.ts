import { EsdtToken } from '../../models/tokens/esdtToken.model';
import { FarmTokenAttributesModel } from '../../models/farm.model';
import { NftToken } from '../../models/tokens/nftToken.model';
import BigNumber from 'bignumber.js';

const pairsMetadata = [
    {
        firstToken: 'WEGLD-b9cba1',
        secondToken: 'MEX-bd9937',
        address: 'pair_address_1',
    },
    {
        firstToken: 'WEGLD-b9cba1',
        secondToken: 'BUSD-f66742',
        address: 'pair_address_2',
    },
    {
        firstToken: 'MEX-bd9937',
        secondToken: 'BUSD-f66742',
        address: 'pair_address_3',
    },
    {
        firstToken: 'MEX-bd9937',
        secondToken: 'SPT-f66742',
        address: 'pair_address_4',
    },
];

const farmMetadata = {
    address: 'farm_address_1',
    farmedTokenID: 'MEX-bd9937',
    farmTokenID: 'FMT-1234',
    farmingTokenID: 'LPT-1111',
    farmTotalSupply: '1000000',
    farmingTokenReserve: '600000',
    rewardsPerBlock: '1',
};

export class ElrondApiServiceMock {
    async getTokensForUser(address: string): Promise<EsdtToken[]> {
        return [
            {
                token: 'MEX-bd9937',
                name: 'MaiarExchangeToken',
                type: 'FungibleESDT',
                owner:
                    'erd1x39tc3q3nn72ecjnmcz7x0qp09kp97t080x99dgyhx7zh95j0n4szskhlv',
                minted: '101000000000000000000000',
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
                balance: '1000000000000000000',
                identifier: null,
            },
        ];
    }

    async getNftsForUser(address: string): Promise<NftToken[]> {
        return [
            {
                token: 'FMT-1234',
                name: 'FarmToken',
                type: 'SemiFungibleESDT',
                owner: 'farm_address_1',
                minted: '0',
                burnt: '0',
                decimals: 0,
                isPaused: false,
                canUpgrade: true,
                canMint: false,
                canBurn: false,
                canChangeOwner: true,
                canPause: true,
                canFreeze: true,
                canWipe: true,
                balance: '1000000000000000000',
                identifier: 'FMT-1234-01',
                canAddSpecialRoles: true,
                canTransferNFTCreateRole: false,
                NFTCreateStopped: false,
                wiped: '0',
                attributes: 'AAAABQeMCWDbAAAAAAAAAF8CAQ==',
                creator: 'farm_address_1',
                nonce: 1,
                royalties: '0',
            },
        ];
    }
}

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
            token: 'LPT-1111',
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

    async getFarmAddressByFarmTokenID(farmTokenID: string): Promise<string> {
        return farmMetadata.address;
    }

    async decodeFarmTokenAttributes(
        identifier: string,
        attributes: string,
    ): Promise<FarmTokenAttributesModel> {
        return {
            identifier: identifier,
            attributes: attributes,
            enteringEpoch: 1,
            aprMultiplier: 1,
            lockedRewards: false,
            rewardPerShare: '3000',
        };
    }

    async getFarmTokenPriceUSD(farmAddress: string): Promise<string> {
        return '200';
    }
}

export class PairServiceMock {
    async getLpToken(pairAddress: string): Promise<EsdtToken> {
        return {
            token: 'LPT-1111',
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
            return 'pair_address_1';
        }
        return;
    }

    async getPriceUSDByPath(tokenID: string): Promise<BigNumber> {
        return new BigNumber('100');
    }
}

export class PriceFeedServiceMock {}

export class ProxyServiceMock {}

export class ProxyPairServiceMock {}

export class ProxyFarmServiceMock {}
