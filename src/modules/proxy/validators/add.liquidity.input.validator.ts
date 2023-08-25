import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UserInputError } from '@nestjs/apollo';
import { scAddress } from 'src/config';
import { AddLiquidityProxyArgs } from '../models/proxy-pair.args';
import { ProxyPairAbiService } from '../services/proxy-pair/proxy.pair.abi.service';

@Injectable()
export class LiquidityTokensValidationPipe implements PipeTransform {
    constructor(private readonly proxyPairAbi: ProxyPairAbiService) {}

    async transform(value: AddLiquidityProxyArgs, metadata: ArgumentMetadata) {
        if (value.tokens.length < 2) {
            throw new UserInputError('invalid number of tokens');
        }

        const firstToken = value.tokens[0];
        const secondToken = value.tokens[1];

        if (firstToken.nonce > 0 && secondToken.nonce > 0) {
            throw new UserInputError('invalid tokens');
        }

        const [intermediatedPairs, wrappedLpTokenID] = await Promise.all([
            this.proxyPairAbi.intermediatedPairs(scAddress.proxyDexAddress.v2),
            this.proxyPairAbi.wrappedLpTokenID(scAddress.proxyDexAddress.v2),
        ]);

        if (!intermediatedPairs.includes(value.pairAddress)) {
            throw new UserInputError('Not an intermediated pair');
        }

        for (const mergeTokens of value.tokens.slice(2)) {
            if (
                mergeTokens.tokenID !== wrappedLpTokenID ||
                mergeTokens.nonce < 1
            ) {
                throw new UserInputError('invalid wrapped lp tokens');
            }
        }

        return value;
    }
}
