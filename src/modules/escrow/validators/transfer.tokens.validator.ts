import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UserInputError } from 'apollo-server-express';
import { InputTokenModel } from 'src/models/inputToken.model';
import { EscrowGetterService } from '../services/escrow.getter.service';

@Injectable()
export class TransferTokensValidator implements PipeTransform {
    constructor(private readonly escrowGetter: EscrowGetterService) {}

    async transform(value: InputTokenModel, metadata: ArgumentMetadata) {
        const lockedTokenID = await this.escrowGetter.getLockedTokenID();
        if (value.tokenID !== lockedTokenID || value.nonce < 1) {
            throw new UserInputError('Invalid transfer tokens');
        }
        return value;
    }
}
