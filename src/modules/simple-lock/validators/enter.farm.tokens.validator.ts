import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { InputTokenModel } from 'src/models/inputToken.model';
import { SimpleLockGetterService } from '../services/simple.lock.getter.service';
import { SimpleLockService } from '../services/simple.lock.service';

@Injectable()
export class EmterFarmProxyTokensValidationPipe implements PipeTransform {
    constructor(
        private readonly simpleLockService: SimpleLockService,
        private readonly simpleLockGetter: SimpleLockGetterService,
    ) {}

    async transform(value: InputTokenModel[], metadata: ArgumentMetadata) {
        const simpleLockAddress =
            await this.simpleLockService.getSimpleLockAddressFromInputTokens(
                value,
            );

        const [lockedLpTokenID, farmProxyTokenID] = await Promise.all([
            this.simpleLockGetter.getLpProxyTokenID(simpleLockAddress),
            this.simpleLockGetter.getFarmProxyTokenID(simpleLockAddress),
        ]);

        if (value[0].tokenID !== lockedLpTokenID || value[0].nonce < 1) {
            throw new Error('Invalid lp proxy token');
        }

        for (const inputToken of value.slice(1)) {
            if (
                inputToken.tokenID !== farmProxyTokenID ||
                inputToken.nonce < 1
            ) {
                throw new Error('Invalid farm proxy token');
            }
        }

        return value;
    }
}
