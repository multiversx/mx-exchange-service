import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UserInputError } from '@nestjs/apollo';
import { InputTokenModel } from 'src/models/inputToken.model';
import { SimpleLockService } from '../services/simple.lock.service';
import { SimpleLockAbiService } from '../services/simple.lock.abi.service';

@Injectable()
export class EmterFarmProxyTokensValidationPipe implements PipeTransform {
    constructor(
        private readonly simpleLockService: SimpleLockService,
        private readonly simpleLockAbi: SimpleLockAbiService,
    ) {}

    async transform(value: InputTokenModel[], metadata: ArgumentMetadata) {
        const simpleLockAddress =
            await this.simpleLockService.getSimpleLockAddressFromInputTokens(
                value,
            );

        const [lockedLpTokenID, farmProxyTokenID] = await Promise.all([
            this.simpleLockAbi.lpProxyTokenID(simpleLockAddress),
            this.simpleLockAbi.farmProxyTokenID(simpleLockAddress),
        ]);

        if (value[0].tokenID !== lockedLpTokenID || value[0].nonce < 1) {
            throw new UserInputError('Invalid lp proxy token');
        }

        for (const inputToken of value.slice(1)) {
            if (
                inputToken.tokenID !== farmProxyTokenID ||
                inputToken.nonce < 1
            ) {
                throw new UserInputError('Invalid farm proxy token');
            }
        }

        return value;
    }
}
