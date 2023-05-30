import { Injectable } from '@nestjs/common';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { EscrowAbiService } from './escrow.abi.service';

@Injectable()
export class EscrowComputeService {
    constructor(
        private readonly contextGetter: ContextGetterService,
        private readonly escrowAbi: EscrowAbiService,
    ) {}

    async isSenderAddressOnCooldown(address: string): Promise<boolean> {
        const currentEpoch = await this.contextGetter.getCurrentEpoch();
        const epochsCooldownDuration =
            await this.escrowAbi.epochsCooldownDuration();
        const lastTransferEpoch = await this.escrowAbi.senderLastTransferEpoch(
            address,
        );

        return lastTransferEpoch === undefined
            ? false
            : currentEpoch - lastTransferEpoch <= epochsCooldownDuration;
    }
}
