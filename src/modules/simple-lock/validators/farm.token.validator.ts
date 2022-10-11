import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { InputTokenModel } from 'src/models/inputToken.model';
import { SimpleLockGetterService } from '../services/simple.lock.getter.service';
import { SimpleLockService } from '../services/simple.lock.service';

@Injectable()
export class FarmProxyTokensValidationPipe implements PipeTransform {
    constructor(
        private readonly simpleLockService: SimpleLockService,
        private readonly simpleLockGetter: SimpleLockGetterService,
    ) {}

    async transform(value: InputTokenModel, metadata: ArgumentMetadata) {
        const simpleLockAddress =
            await this.simpleLockService.getSimpleLockAddressFromInputTokens([
                value,
            ]);

        const farmProxyTokenID =
            await this.simpleLockGetter.getFarmProxyTokenID(simpleLockAddress);

        if (value.tokenID !== farmProxyTokenID || value.nonce < 1) {
            throw new Error('Invalid farm proxy token');
        }
        return value;
    }
}
