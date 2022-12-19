import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UserInputError } from 'apollo-server-express';
import { RemoveLiquidityProxyArgs } from '../models/proxy-pair.args';
import { ProxyPairGetterService } from '../services/proxy-pair/proxy-pair.getter.service';
import { ProxyService } from '../services/proxy.service';

@Injectable()
export class WrappedLpValidationPipe implements PipeTransform {
    constructor(
        private readonly proxyService: ProxyService,
        private readonly proxyPairGetter: ProxyPairGetterService,
    ) {}

    async transform(
        value: RemoveLiquidityProxyArgs,
        metadata: ArgumentMetadata,
    ) {
        if (value.wrappedLpTokenNonce < 1) {
            throw new UserInputError('invalid meta esdt token');
        }
        const proxyAddress = await this.proxyService.getProxyAddressByToken(
            value.wrappedLpTokenID,
        );
        const intermediatedPairs =
            await this.proxyPairGetter.getIntermediatedPairs(proxyAddress);
        if (!intermediatedPairs.includes(value.pairAddress)) {
            throw new UserInputError('not an intermediated pair');
        }

        return value;
    }
}
