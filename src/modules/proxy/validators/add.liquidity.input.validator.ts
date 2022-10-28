import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UserInputError } from 'apollo-server-express';
import { InputTokenModel } from 'src/models/inputToken.model';
import { AddLiquidityProxyArgs } from '../models/proxy-pair.args';
import { ProxyPairGetterService } from '../services/proxy-pair/proxy-pair.getter.service';
import { ProxyService } from '../services/proxy.service';

@Injectable()
export class LiquidityTokensValidationPipe implements PipeTransform {
    constructor(
        private readonly proxyService: ProxyService,
        private readonly proxyPairGetter: ProxyPairGetterService,
    ) {}

    async transform(value: AddLiquidityProxyArgs, metadata: ArgumentMetadata) {
        if (value.tokens.length < 2) {
            throw new UserInputError('invalid number of tokens');
        }

        const firstToken = value.tokens[0];
        const secondToken = value.tokens[1];
        let lockedAssetToken: InputTokenModel;
        if (firstToken.nonce > 0 && secondToken.nonce > 0) {
            throw new UserInputError('invalid tokens');
        } else if (firstToken.nonce > 0) {
            lockedAssetToken = firstToken;
        } else {
            lockedAssetToken = secondToken;
        }

        const proxyAddress = await this.proxyService.getProxyAddressByToken(
            lockedAssetToken.tokenID,
        );
        const [intermediatedPairs, wrappedLpTokenID] = await Promise.all([
            this.proxyPairGetter.getIntermediatedPairs(proxyAddress),
            this.proxyPairGetter.getwrappedLpTokenID(proxyAddress),
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
