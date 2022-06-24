import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { Tokens } from 'src/modules/pair/mocks/pair.constants';
import { ContextService } from 'src/services/context/context.service';
import { farms } from './farm.constants';

export class FarmGetterServiceMock {
    constructor(private readonly context: ContextService) {}
    async getFarmedTokenID(farmAddress: string): Promise<string> {
        return farms.find(f => f.address === farmAddress).farmedTokenID;
    }

    async getFarmTokenID(farmAddress: string): Promise<string> {
        return farms.find(f => f.address === farmAddress).farmTokenID;
    }

    async getFarmingTokenID(farmAddress: string): Promise<string> {
        return farms.find(f => f.address === farmAddress).farmingTokenID;
    }

    async getFarmedToken(farmAddress: string): Promise<EsdtToken> {
        const farmedTokenID = await this.getFarmedTokenID(farmAddress);
        return Tokens(farmedTokenID);
    }

    async getFarmToken(farmAddress: string): Promise<NftCollection> {
        const farmTokenID = await this.getFarmTokenID(farmAddress);
        return {
            collection: farmTokenID,
            name: farmTokenID,
            decimals: 18,
            NFTCreateStopped: false,
            canAddSpecialRoles: true,
            canBurn: true,
            canChangeOwner: true,
            canFreeze: true,
            canMint: true,
            canPause: true,
            canTransferNFTCreateRole: true,
            canUpgrade: true,
            canWipe: true,
            issuer: 'user_address_1',
            ticker: farmTokenID,
            timestamp: 12345678,
        };
    }

    async getFarmingToken(farmAddress: string): Promise<EsdtToken> {
        const farmingTokenID = await this.getFarmingTokenID(farmAddress);
        return Tokens(farmingTokenID);
    }

    async getFarmTokenSupply(farmAddress: string): Promise<string> {
        return farms.find(f => f.address === farmAddress).farmTotalSupply;
    }

    async getFarmingTokenReserve(farmAddress: string): Promise<string> {
        return farms.find(f => f.address === farmAddress).farmingTokenReserve;
    }

    async getRewardsPerBlock(farmAddress: string): Promise<string> {
        return farms.find(f => f.address === farmAddress).rewardsPerBlock;
    }

    async getPenaltyPercent(farmAddress: string): Promise<number> {
        return 10;
    }

    async getMinimumFarmingEpochs(farmAddress: string): Promise<number> {
        return 3;
    }
    async getLockedRewardAprMuliplier(farmAddress: string): Promise<number> {
        return 2;
    }

    async getState(farmAddress: string): Promise<string> {
        return 'true';
    }

    async getRewardPerShare(farmAddress: string): Promise<string> {
        return '100';
    }

    async getLastRewardBlockNonce(farmAddress: string): Promise<number> {
        return 1;
    }

    async getUndistributedFees(farmAddress: string): Promise<string> {
        return '100';
    }

    async getCurrentBlockFee(farmAddress: string): Promise<string> {
        return '0';
    }

    async getDivisionSafetyConstant(farmAddress: string): Promise<string> {
        return '1000000';
    }

    async getTokenPriceUSD(farmAddress: string): Promise<string> {
        return '100';
    }

    async getFarmedTokenPriceUSD(farmAddress: string): Promise<string> {
        return '100';
    }

    async getFarmTokenPriceUSD(farmAddress: string): Promise<string> {
        return '200';
    }

    async getFarmingTokenPriceUSD(farmAddress: string): Promise<string> {
        return '200';
    }

    async getProduceRewardsEnabled(farmAddress: string): Promise<boolean> {
        return true;
    }

    async getWhitelist(farmAddress: string): Promise<string[]> {
        return [];
    }
}
