import { PhaseModel } from '../models/price.discovery.model';
import { IPriceDiscoveryAbiService } from '../services/interfaces';
import { PriceDiscoveryAbiService } from '../services/price.discovery.abi.service';

export class PriceDiscoveryAbiServiceMock implements IPriceDiscoveryAbiService {
    async launchedTokenID(): Promise<string> {
        return 'LTOK-123456';
    }
    async acceptedTokenID(): Promise<string> {
        return 'ATOK-123456';
    }
    async redeemTokenID(): Promise<string> {
        return 'RTOK-123456';
    }
    launchedTokenAmount(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    acceptedTokenAmount(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    launchedTokenRedeemAmount(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    acceptedTokenRedeemAmount(): Promise<string> {
        throw new Error('Method not implemented.');
    }

    async startBlock(): Promise<number> {
        return 1;
    }

    async endBlock(): Promise<number> {
        return 10;
    }

    currentPhase(): Promise<PhaseModel> {
        throw new Error('Method not implemented.');
    }
    minLaunchedTokenPrice(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    noLimitPhaseDurationBlocks(): Promise<number> {
        throw new Error('Method not implemented.');
    }
    linearPenaltyPhaseDurationBlocks(): Promise<number> {
        throw new Error('Method not implemented.');
    }
    fixedPenaltyPhaseDurationBlocks(): Promise<number> {
        throw new Error('Method not implemented.');
    }
    lockingScAddress(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    unlockEpoch(): Promise<number> {
        throw new Error('Method not implemented.');
    }
    penaltyMinPercentage(): Promise<number> {
        throw new Error('Method not implemented.');
    }
    penaltyMaxPercentage(): Promise<number> {
        throw new Error('Method not implemented.');
    }
    fixedPenaltyPercentage(): Promise<number> {
        throw new Error('Method not implemented.');
    }
}

export const PriceDiscoveryAbiServiceProvider = {
    provide: PriceDiscoveryAbiService,
    useClass: PriceDiscoveryAbiServiceMock,
};
