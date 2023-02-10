import { Inject, Injectable } from '@nestjs/common';
import { GenericGetterService } from '../../../../services/generics/generic.getter.service';
import { UserEnergyComputeService } from './user.energy.compute.service';
import { CachingService } from '../../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { OutdatedContract } from '../../models/user.model';
import { oneMinute } from '../../../../helpers/helpers';

@Injectable()
export class UserEnergyGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly userEnergyCompute: UserEnergyComputeService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'userEnergyGetter';
    }

    async getUserOutdatedContracts(userAddress: string): Promise<OutdatedContract[]> {
        return await this.cachingService.getOrSetRemote(
            this.getCacheKey('userOutdatedContracts', userAddress),
            () => this.userEnergyCompute.computeUserOutdatedContracts(userAddress),
            oneMinute(),
        )
    }

    async getUserActiveFarmsV2(userAddress: string): Promise<OutdatedContract[]> {
        return await this.getData(
            this.getCacheKey('userActiveFarms', userAddress),
            () => this.userEnergyCompute.computeActiveFarmsV2ForUser(userAddress),
            oneMinute(),
            oneMinute(),
        )
    }
}
