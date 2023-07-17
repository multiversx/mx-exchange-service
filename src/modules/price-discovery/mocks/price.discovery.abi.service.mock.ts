import { PhaseModel } from '../models/price.discovery.model';
import { IPriceDiscoveryAbiService } from '../services/interfaces';
import { PriceDiscoveryAbiService } from '../services/price.discovery.abi.service';

export class PriceDiscoveryAbiServiceMock implements IPriceDiscoveryAbiService {
    async launchedTokenID(priceDiscoveryAddress: string): Promise<string> {
        return 'LTOK-123456';
    }
    async acceptedTokenID(priceDiscoveryAddress: string): Promise<string> {
        return 'ATOK-123456';
    }
    async redeemTokenID(priceDiscoveryAddress: string): Promise<string> {
        return 'RTOK-123456';
    }
    launchedTokenAmount(priceDiscoveryAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    acceptedTokenAmount(priceDiscoveryAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    launchedTokenRedeemAmount(priceDiscoveryAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    acceptedTokenRedeemAmount(priceDiscoveryAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }

    async startBlock(priceDiscoveryAddress: string): Promise<number> {
        return 1;
    }

    async endBlock(priceDiscoveryAddress: string): Promise<number> {
        return 10;
    }

    currentPhase(priceDiscoveryAddress: string): Promise<PhaseModel> {
        throw new Error('Method not implemented.');
    }
    minLaunchedTokenPrice(priceDiscoveryAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    noLimitPhaseDurationBlocks(priceDiscoveryAddress: string): Promise<number> {
        throw new Error('Method not implemented.');
    }
    linearPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        throw new Error('Method not implemented.');
    }
    fixedPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        throw new Error('Method not implemented.');
    }
    lockingScAddress(priceDiscoveryAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    unlockEpoch(priceDiscoveryAddress: string): Promise<number> {
        throw new Error('Method not implemented.');
    }
    penaltyMinPercentage(priceDiscoveryAddress: string): Promise<number> {
        throw new Error('Method not implemented.');
    }
    penaltyMaxPercentage(priceDiscoveryAddress: string): Promise<number> {
        throw new Error('Method not implemented.');
    }
    fixedPenaltyPercentage(priceDiscoveryAddress: string): Promise<number> {
        throw new Error('Method not implemented.');
    }
}

export const PriceDiscoveryAbiServiceProvider = {
    provide: PriceDiscoveryAbiService,
    useClass: PriceDiscoveryAbiServiceMock,
};
