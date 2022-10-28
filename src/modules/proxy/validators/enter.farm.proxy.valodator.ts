import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UserInputError } from 'apollo-server-express';
import { EnterFarmProxyArgs } from '../models/proxy-farm.args';
import { ProxyFarmGetterService } from '../services/proxy-farm/proxy-farm.getter.service';
import { ProxyService } from '../services/proxy.service';

@Injectable()
export class EnterFarmProxyValidationPipe implements PipeTransform {
    constructor(
        private readonly proxyService: ProxyService,
        private readonly proxyFarmGetter: ProxyFarmGetterService,
    ) {}

    async transform(value: EnterFarmProxyArgs, metadata: ArgumentMetadata) {
        if (value.tokens[0].nonce < 1) {
            throw new UserInputError('invalid meta esdt token');
        }
        const proxyAddress = await this.proxyService.getProxyAddressByToken(
            value.tokens[0].tokenID,
        );

        const wrappedFarmTokenID =
            await this.proxyFarmGetter.getwrappedFarmTokenID(proxyAddress);
        for (const token of value.tokens.slice(1)) {
            if (token.tokenID !== wrappedFarmTokenID || token.nonce < 1) {
                throw new UserInputError(
                    'invalid wrapped farm token for merge',
                );
            }
        }

        return value;
    }
}
