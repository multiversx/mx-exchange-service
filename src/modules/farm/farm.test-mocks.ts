import { TokenModel } from '../../models/esdtToken.model';

interface PairMetadata {
    address: string;
    firstToken: string;
    secondToken: string;
}

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

export class FarmServiceMock {
    async getFarmingTokenID(farmAddress: string): Promise<string> {
        return farmMetadata.farmingTokenID;
    }

    async getFarmedTokenID(farmAddress: string): Promise<string> {
        return farmMetadata.farmedTokenID;
    }

    async getFarmTokenPriceUSD(farmAddress: string): Promise<string> {
        return '200';
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
    async getTokenPriceUSD(
        pairAddress: string,
        tokenID: string,
    ): Promise<string> {
        return '100';
    }

    async getLpTokenPriceUSD(pairAddress): Promise<string> {
        return '200';
    }

    async getPairAddressByLpTokenID(tokenID: string): Promise<string> {
        return 'pair_address_1';
    }
}
