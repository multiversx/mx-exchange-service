import {
    ESCROW_EVENTS,
    EscrowCancelTransferEvent,
    EscrowLockFundsEvent,
    EscrowWithdrawEvent,
} from '@multiversx/sdk-exchange';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { scAddress } from 'src/config';
import { EscrowAbiService } from 'src/modules/escrow/services/escrow.abi.service';
import { EscrowSetterService } from 'src/modules/escrow/services/escrow.setter.service';
import { MXGatewayService } from 'src/services/multiversx-communication/mx.gateway.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';

@Injectable()
export class EscrowHandlerService {
    constructor(
        private readonly escrowAbi: EscrowAbiService,
        private readonly escrowSetter: EscrowSetterService,
        private readonly mxGateway: MXGatewayService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    async handleEscrowLockFundsEvent(event: EscrowLockFundsEvent) {
        await this.handleEscrowEvent(
            event.sender.bech32(),
            event.receiver.bech32(),
        );

        const invalidatedKeys = await Promise.all([
            this.escrowSetter.setSenderLastTransferEpoch(
                event.sender.bech32(),
                event.lockedFunds.lockedEpoch,
            ),
        ]);

        await this.deleteCacheKeys(invalidatedKeys);
        await this.pubSub.publish(ESCROW_EVENTS.LOCK_FUNDS, {
            escrowLockFunds: event,
        });
    }

    async handleEscrowWithdrawEvent(event: EscrowWithdrawEvent): Promise<void> {
        await this.handleEscrowEvent(
            event.sender.bech32(),
            event.receiver.bech32(),
        );

        const invalidatedKeys = await Promise.all([
            this.escrowSetter.setReceiverLastTransferEpoch(
                event.receiver.bech32(),
                event.lockedFunds.lockedEpoch,
            ),
        ]);

        await this.deleteCacheKeys(invalidatedKeys);

        await this.pubSub.publish(ESCROW_EVENTS.WITHDRAW, {
            escrowWithdraw: event,
        });
    }

    async handleEscrowCancelTransferEvent(
        event: EscrowCancelTransferEvent,
    ): Promise<void> {
        await this.handleEscrowEvent(
            event.sender.bech32(),
            event.receiver.bech32(),
        );

        const invalidatedKeys = await Promise.all([
            this.escrowSetter.setSenderLastTransferEpoch(
                event.sender.bech32(),
                0,
            ),
        ]);

        await this.deleteCacheKeys(invalidatedKeys);
        await this.pubSub.publish(ESCROW_EVENTS.CANCEL_TRANSFER, {
            escrowCancelTransfer: event,
        });
    }

    private async handleEscrowEvent(
        sender: string,
        receiver: string,
    ): Promise<void> {
        const scKeys = await this.mxGateway.getSCStorageKeys(
            scAddress.escrow,
            [],
        );
        const cachedKey = await this.escrowSetter.setSCStorageKeys(scKeys);
        await this.deleteCacheKeys([cachedKey]);

        const [allSenders, allReceivers, scheduledTransfers] =
            await Promise.all([
                this.escrowAbi.getAllSendersRaw(receiver),
                this.escrowAbi.getAllReceiversRaw(sender),
                this.escrowAbi.getScheduledTransfersRaw(receiver),
            ]);

        const invalidatedKeys = await Promise.all([
            this.escrowSetter.setAllSenders(receiver, allSenders),
            this.escrowSetter.setAllReceivers(sender, allReceivers),
            this.escrowSetter.setScheduledTransfers(
                receiver,
                scheduledTransfers,
            ),
        ]);

        await this.deleteCacheKeys(invalidatedKeys);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
