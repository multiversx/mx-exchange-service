import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UserInputError } from '@nestjs/apollo';
import { InputTokenModel } from 'src/models/inputToken.model';
import { SimpleLockService } from '../services/simple.lock.service';
import { SimpleLockAbiService } from '../services/simple.lock.abi.service';

@Injectable()
export class FarmProxyTokensValidationPipe implements PipeTransform {
    constructor(
        private readonly simpleLockService: SimpleLockService,
        private readonly simpleLockAbi: SimpleLockAbiService,
    ) {}

    async transform(value: InputTokenModel, metadata: ArgumentMetadata) {
        const simpleLockAddress =
            await this.simpleLockService.getSimpleLockAddressFromInputTokens([
                value,
            ]);

        const farmProxyTokenID = await this.simpleLockAbi.farmProxyTokenID(
            simpleLockAddress,
        );

        if (value.tokenID !== farmProxyTokenID || value.nonce < 1) {
            throw new UserInputError('Invalid farm proxy token');
        }
        return value;
    }
}
