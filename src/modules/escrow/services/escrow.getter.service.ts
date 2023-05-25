import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneDay } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { Logger } from 'winston';
import { SCPermissions, ScheduledTransferModel } from '../models/escrow.model';
import { EscrowAbiService } from './escrow.abi.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

@Injectable()
export class EscrowGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly escrowAbi: EscrowAbiService,
    ) {
        super(cachingService, logger);

        this.baseKey = 'escrow';
    }

    async getEnergyFactoryAddress(): Promise<string> {
        return await this.getData(
            this.getCacheKey('energyFactoryAddress'),
            () => this.escrowAbi.getEnergyFactoryAddress(),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getLockedTokenID(): Promise<string> {
        return await this.getData(
            this.getCacheKey('lockedTokenID'),
            () => this.escrowAbi.getLockedTokenID(),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getMinLockEpochs(): Promise<number> {
        return await this.getData(
            this.getCacheKey('minLockEpochs'),
            () => this.escrowAbi.getMinLockEpochs(),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getEpochCooldownDuration(): Promise<number> {
        return await this.getData(
            this.getCacheKey('epochCooldownDuration'),
            () => this.escrowAbi.getEpochCooldownDuration(),
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async getScheduledTransfers(
        receiverAddress: string,
    ): Promise<ScheduledTransferModel[]> {
        return await this.getData(
            this.getCacheKey('scheduledTransfers', receiverAddress),
            () => this.escrowAbi.getScheduledTransfers(receiverAddress),
            oneDay(),
        );
    }

    async getAllSenders(receiverAddress: string): Promise<string[]> {
        return await this.getData(
            this.getCacheKey('allSenders', receiverAddress),
            () => this.escrowAbi.getAllSenders(receiverAddress),
            oneDay(),
        );
    }

    async getAllReceivers(senderAddress: string): Promise<string[]> {
        return await this.getData(
            this.getCacheKey('allReceivers', senderAddress),
            () => this.escrowAbi.getAllReceivers(senderAddress),
            oneDay(),
        );
    }

    async getSenderLastTransferEpoch(
        address: string,
    ): Promise<number | undefined> {
        const value = await this.getData(
            this.getCacheKey('senderLastTransferEpoch', address),
            () => this.escrowAbi.getSenderLastTransferEpoch(address),
            oneDay(),
        );

        return value > 0 ? value : undefined;
    }

    async getReceiverLastTransferEpoch(address: string): Promise<number> {
        const value = await this.getData(
            this.getCacheKey('receiverLastTransferEpoch', address),
            () => this.escrowAbi.getReceiverLastTransferEpoch(address),
            oneDay(),
        );

        return value > 0 ? value : undefined;
    }

    // Get permission for address as SCPermission from cache or from blockchain
    async getAddressPermission(address: string): Promise<SCPermissions[]> {
        return await this.getData(
            this.getCacheKey('addressPermission', address),
            () => this.escrowAbi.getAddressPermission(address),
            oneDay(),
        );
    }
}
