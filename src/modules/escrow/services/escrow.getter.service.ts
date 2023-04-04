import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { Logger } from 'winston';
import { SCPermissions, ScheduledTransferModel } from '../models/escrow.model';
import { EscrowAbiService } from './escrow.abi.service';

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
            'energyFactoryAddress',
            () => this.escrowAbi.getEnergyFactoryAddress(),
            oneSecond(),
            oneSecond(),
        );
    }

    async getLockedTokenID(): Promise<string> {
        return await this.getData(
            'lockedTokenID',
            () => this.escrowAbi.getLockedTokenID(),
            oneSecond(),
            oneSecond(),
        );
    }

    async getMinLockEpochs(): Promise<number> {
        return await this.getData(
            'minLockEpochs',
            () => this.escrowAbi.getMinLockEpochs(),
            oneSecond(),
            oneSecond(),
        );
    }

    async getEpochCooldownDuration(): Promise<number> {
        return await this.getData(
            'epochCooldownDuration',
            () => this.escrowAbi.getEpochCooldownDuration(),
            oneSecond(),
            oneSecond(),
        );
    }

    async getScheduledTransfers(
        receiverAddress: string,
    ): Promise<ScheduledTransferModel[]> {
        return await this.getData(
            `scheduledTransfer.${receiverAddress}`,
            () => this.escrowAbi.getScheduledTransfers(receiverAddress),
            oneSecond(),
            oneSecond(),
        );
    }

    async getAllSenders(receiverAddress: string): Promise<string[]> {
        return await this.getData(
            `allSenders.${receiverAddress}`,
            () => this.escrowAbi.getAllSenders(receiverAddress),
            oneSecond(),
            oneSecond(),
        );
    }

    async getSenderLastTransferEpoch(address: string): Promise<number> {
        return await this.getData(
            `senderLastTransferEpoch.${address}`,
            () => this.escrowAbi.getSenderLastTransferEpoch(address),
            oneSecond(),
            oneSecond(),
        );
    }

    async getReceiverLastTransferEpoch(address: string): Promise<number> {
        return await this.getData(
            `receiverLastTransferEpoch.${address}`,
            () => this.escrowAbi.getReceiverLastTransferEpoch(address),
            oneSecond(),
            oneSecond(),
        );
    }

        return await this.getData(
            `lastTransferEpoch.${address}`,
            () => this.escrowAbi.getAddressLastTransferEpoch(address),
            oneSecond(),
            oneSecond(),
        );
    }

    // Get permission for address as SCPermission from cache or from blockchain
    async getAddressPermission(address: string): Promise<SCPermissions[]> {
        return await this.getData(
            `permission.${address}`,
            () => this.escrowAbi.getAddressPermission(address),
            oneSecond(),
            oneSecond(),
        );
    }
}
