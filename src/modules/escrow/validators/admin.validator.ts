import { Injectable, PipeTransform } from '@nestjs/common';
import { ForbiddenError } from 'apollo-server-express';
import { UserAuthResult } from 'src/modules/auth/user.auth.result';
import { SCPermissions } from '../models/escrow.model';
import { EscrowAbiService } from '../services/escrow.abi.service';

@Injectable()
export class EscrowAdminValidator implements PipeTransform {
    constructor(private readonly escrowAbi: EscrowAbiService) {}

    async transform(value: UserAuthResult) {
        const permissions = await this.escrowAbi.addressPermission(
            value.address,
        );
        if (!permissions.includes(SCPermissions.ADMIN)) {
            throw new ForbiddenError('User is not an admin');
        }
        return value;
    }
}
