import { Injectable, PipeTransform } from '@nestjs/common';
import { ForbiddenError } from 'apollo-server-express';
import { UserAuthResult } from 'src/modules/auth/user.auth.result';
import { EscrowComputeService } from '../services/escrow.compute.service';

@Injectable()
export class SenderCooldownValidator implements PipeTransform {
    constructor(private readonly escrowCompute: EscrowComputeService) {}

    async transform(value: UserAuthResult) {
        const isAddressOnCooldown =
            await this.escrowCompute.isSenderAddressOnCooldown(value.address);
        if (isAddressOnCooldown) {
            throw new ForbiddenError('Sender in cooldown period');
        }
        return value;
    }
}
