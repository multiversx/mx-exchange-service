import { TokenModel } from '../models/esdtToken.model';

interface PairMetadata {
    address: string;
    firstToken: string;
    secondToken: string;
}

const pairsMetadata = [
    {
        firstToken: 'WEGLD-ccae2d',
        secondToken: 'MEX-53c38d',
        address: 'pair_address_1',
    },
    {
        firstToken: 'WEGLD-ccae2d',
        secondToken: 'BUSD-f66742',
        address: 'pair_address_2',
    },
    {
        firstToken: 'MEX-53c38d',
        secondToken: 'BUSD-f66742',
        address: 'pair_address_3',
    },
    {
        firstToken: 'MEX-53c38d',
        secondToken: 'SPT-f66742',
        address: 'pair_address_4',
    },
];

const farmMetadata = {
    address: 'farm_address_1',
    farmedTokenID: 'MEX-53c38d',
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

    async getFarmTokenSupply(farmAddress: string): Promise<string> {
        return farmMetadata.farmTotalSupply;
    }

    async getFarmingTokenReserve(farmAddress: string): Promise<string> {
        return farmMetadata.farmingTokenReserve;
    }

    async getRewardsPerBlock(farmAddress: string): Promise<string> {
        return farmMetadata.rewardsPerBlock;
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

export class PairServiceMock {
    async getLpToken(pairAddress: string): Promise<TokenModel> {
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

    async getTokenPriceUSD(
        pairAddress: string,
        tokenID: string,
    ): Promise<string> {
        return '100';
    }

    async getLpTokenPriceUSD(pairAddress): Promise<string> {
        return '200';
    }
}
