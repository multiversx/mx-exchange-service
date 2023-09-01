import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UserInputError } from '@nestjs/apollo';
import { RemoveLiquidityProxyArgs } from '../models/proxy-pair.args';
import { ProxyService } from '../services/proxy.service';
import { ProxyPairAbiService } from '../services/proxy-pair/proxy.pair.abi.service';

@Injectable()
export class WrappedLpValidationPipe implements PipeTransform {
    constructor(
        private readonly proxyService: ProxyService,
        private readonly proxyPairAbi: ProxyPairAbiService,
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
        const intermediatedPairs = await this.proxyPairAbi.intermediatedPairs(
            proxyAddress,
        );
        if (!intermediatedPairs.includes(value.pairAddress)) {
            throw new UserInputError('not an intermediated pair');
        }

        return value;
    }
}
