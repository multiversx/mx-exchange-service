import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { ForbiddenError } from 'apollo-server-express';
import { UserAuthResult } from 'src/modules/auth/user.auth.result';
import { EscrowGetterService } from '../services/escrow.getter.service';
import { SCPermissions } from '../models/escrow.model';

@Injectable()
export class EscrowAdminValidator implements PipeTransform {
    constructor(private readonly escrowGetter: EscrowGetterService) {}

    async transform(value: UserAuthResult, metadata: ArgumentMetadata) {
        const permissions = await this.escrowGetter.getAddressPermission(
            value.address,
        );
        if (!permissions.includes(SCPermissions.ADMIN)) {
            throw new ForbiddenError('User is not an admin');
        }
        return value;
    }
}
