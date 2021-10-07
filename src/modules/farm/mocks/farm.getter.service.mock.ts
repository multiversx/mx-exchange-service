import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { Tokens } from 'src/modules/pair/mocks/pair.constants';
import { ContextService } from 'src/services/context/context.service';

export class FarmGetterServiceMock {
    constructor(private readonly context: ContextService) {}
    async getFarmedTokenID(farmAddress: string): Promise<string> {
        return 'TOK2-2222';
    }

    async getFarmTokenID(farmAddress: string): Promise<string> {
        return 'FMT-1234';
    }

    async getFarmingTokenID(farmAddress: string): Promise<string> {
        return 'LPT-1234';
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
        return '1000000000000000000000000';
    }

    async getFarmingTokenReserve(farmAddress: string): Promise<string> {
        return '600000000000000000000000';
    }

    async getRewardsPerBlock(farmAddress: string): Promise<string> {
        return '1000000000000000000';
    }

    async getPenaltyPercent(farmAddress: string): Promise<number> {
        return 10;
    }

    async getMinimumFarmingEpochs(farmAddress: string): Promise<number> {
        return 3;
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

    async getFarmedTokenPriceUSD(farmAddress: string): Promise<string> {
        return '100';
    }

    async getFarmTokenPriceUSD(farmAddress: string): Promise<string> {
        return '200';
    }

    async getFarmingTokenPriceUSD(farmAddress: string): Promise<string> {
        return '200';
    }
}
