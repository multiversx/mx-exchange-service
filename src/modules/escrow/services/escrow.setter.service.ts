import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { CacheService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Logger } from 'winston';
import { ScheduledTransferModel } from '../models/escrow.model';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

@Injectable()
export class EscrowSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'escrow';
    }

    async setScheduledTransfers(
        receiverAddress: string,
        value: ScheduledTransferModel[],
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('scheduledTransfers', receiverAddress),
            value,
            Constants.oneDay(),
        );
    }

    async setAllSenders(
        receiverAddress: string,
        value: string[],
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('allSenders', receiverAddress),
            value,
            Constants.oneDay(),
        );
    }

    async setAllReceivers(
        senderAddress: string,
        value: string[],
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('allReceivers', senderAddress),
            value,
            Constants.oneDay(),
        );
    }

    async setSenderLastTransferEpoch(
        address: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('senderLastTransferEpoch', address),
            value,
            Constants.oneDay(),
        );
    }

    async setReceiverLastTransferEpoch(
        address: string,
        value: number,
    ): Promise<string> {
        return await this.setData(
            this.getCacheKey('receiverLastTransferEpoch', address),
            value,
            Constants.oneDay(),
        );
    }

    async setSCStorageKeys(value: object): Promise<string> {
        return await this.setData(
            this.getCacheKey('scKeys'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }
}
