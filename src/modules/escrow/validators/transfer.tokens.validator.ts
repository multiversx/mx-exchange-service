import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UserInputError } from '@nestjs/apollo';
import { InputTokenModel } from 'src/models/inputToken.model';
import { EscrowAbiService } from '../services/escrow.abi.service';

@Injectable()
export class TransferTokensValidator implements PipeTransform {
    constructor(private readonly escrowAbi: EscrowAbiService) {}

    async transform(value: InputTokenModel[], metadata: ArgumentMetadata) {
        const lockedTokenID = await this.escrowAbi.lockedTokenID();
        for (const payment of value) {
            if (payment.tokenID !== lockedTokenID || payment.nonce < 1) {
                throw new UserInputError('Invalid transfer tokens');
            }
        }
        return value;
    }
}
