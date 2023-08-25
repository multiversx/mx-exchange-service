import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { ForbiddenError } from '@nestjs/apollo';
import { UserAuthResult } from 'src/modules/auth/user.auth.result';
import { SCPermissions } from '../models/escrow.model';
import { EscrowAbiService } from '../services/escrow.abi.service';

@Injectable()
export class EscrowAdminValidator implements PipeTransform {
    constructor(private readonly escrowAbi: EscrowAbiService) {}

    async transform(value: UserAuthResult, metadata: ArgumentMetadata) {
        const permissions = await this.escrowAbi.addressPermission(
            value.address,
        );
        if (!permissions.includes(SCPermissions.ADMIN)) {
            throw new ForbiddenError('User is not an admin');
        }
        return value;
    }
}
