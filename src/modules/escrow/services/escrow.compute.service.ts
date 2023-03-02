import { Injectable } from '@nestjs/common';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { EscrowGetterService } from './escrow.getter.service';

@Injectable()
export class EscrowComputeService {
    constructor(
        private readonly contextGetter: ContextGetterService,
        private readonly escrowGetter: EscrowGetterService,
    ) {}

    async isAddressOnCooldown(address: string): Promise<boolean> {
        const currentEpoch = await this.contextGetter.getCurrentEpoch();
        const epochsCooldownDuration =
            await this.escrowGetter.getEpochCooldownDuration();
        const lastTransferEpoch =
            await this.escrowGetter.getAddressLastTransferEpoch(address);

        return lastTransferEpoch === undefined
            ? false
            : currentEpoch - lastTransferEpoch <= epochsCooldownDuration;
    }
}
