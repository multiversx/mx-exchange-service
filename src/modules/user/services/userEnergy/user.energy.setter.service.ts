import { Inject, Injectable } from '@nestjs/common';
import { CacheService } from 'src/services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { OutdatedContract } from '../../models/user.model';
import { GenericSetterService } from '../../../../services/generics/generic.setter.service';
import { Constants } from '@multiversx/sdk-nestjs-common';

@Injectable()
export class UserEnergySetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'userEnergy';
    }

    async setUserOutdatedContract(
        userAddress: string,
        contractAddress: string,
        value: OutdatedContract,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('outdatedContract', userAddress, contractAddress),
            value,
            Constants.oneMinute() * 10,
        );
    }

    async delUserOutdatedContracts(userAddress: string): Promise<string> {
        return this.delData(
            this.getCacheKey('userOutdatedContracts', userAddress),
        );
    }
}
