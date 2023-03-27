import { Inject, Injectable } from '@nestjs/common';
import { GenericGetterService } from '../../../../services/generics/generic.getter.service';
import { UserEnergyComputeService } from './user.energy.compute.service';
import { CachingService } from '../../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { OutdatedContract } from '../../models/user.model';
import { oneMinute } from '../../../../helpers/helpers';
import { EnergyGetterService } from 'src/modules/energy/services/energy.getter.service';
import { EnergyType } from '@multiversx/sdk-exchange';
import { scAddress } from 'src/config';

@Injectable()
export class UserEnergyGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly userEnergyCompute: UserEnergyComputeService,
        private readonly energyGetter: EnergyGetterService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'userEnergy';
    }

    async getUserOutdatedContract(
        userAddress: string,
        userEnergy: EnergyType,
        contractAddress: string,
    ): Promise<OutdatedContract> {
        return await this.getData(
            this.getCacheKey('outdatedContract', userAddress, contractAddress),
            () =>
                this.userEnergyCompute.computeUserOutdatedContract(
                    userAddress,
                    userEnergy,
                    contractAddress,
                ),
            oneMinute() * 10,
        );
    }

    async getUserOutdatedContracts(
        userAddress: string,
        skipFeesCollector = false,
    ): Promise<OutdatedContract[]> {
        const activeFarms = await this.getUserActiveFarmsV2(userAddress);
        const userEnergy = await this.energyGetter.getEnergyEntryForUser(
            userAddress,
        );

        const promises = activeFarms.map((farm) =>
            this.getUserOutdatedContract(userAddress, userEnergy, farm),
        );
        if (!skipFeesCollector) {
            promises.push(
                this.getUserOutdatedContract(
                    userAddress,
                    userEnergy,
                    scAddress.feesCollector,
                ),
            );
        }

        const outdatedContracts = await Promise.all(promises);
        return outdatedContracts.filter(
            (contract) => contract && contract.address,
        );
    }

    async getUserActiveFarmsV2(userAddress: string): Promise<string[]> {
        return this.getData(
            this.getCacheKey('userActiveFarms', userAddress),
            () =>
                this.userEnergyCompute.computeActiveFarmsV2ForUser(userAddress),
            oneMinute(),
        );
    }
}
