import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { mxConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { TokenUnstakeGetterService } from './token.unstake.getter.service';

@Injectable()
export class TokenUnstakeTransactionService {
    constructor(
        private readonly tokenUnstakeGetter: TokenUnstakeGetterService,
        private readonly elrondProxy: ElrondProxyService,
    ) {}

    async claimUnlockedTokens(sender: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getTokenUnstakeContract();

        const unstakedTokens =
            await this.tokenUnstakeGetter.getUnlockedTokensForUser(sender);
        const gasLimit = new BigNumber(
            gasConfig.tokenUnstake.claimUnlockedTokens.default,
        ).plus(
            new BigNumber(
                gasConfig.tokenUnstake.claimUnlockedTokens.additionalTokens,
            ).multipliedBy(unstakedTokens.length),
        );

        return contract.methodsExplicit
            .claimUnlockedTokens()
            .withChainID(mxConfig.chainID)
            .withGasLimit(gasLimit.integerValue().toNumber())
            .buildTransaction()
            .toPlainObject();
    }

    async cancelUnbond(): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getTokenUnstakeContract();
        return contract.methodsExplicit
            .cancelUnbond()
            .withChainID(mxConfig.chainID)
            .withGasLimit(gasConfig.tokenUnstake.cancelUnbond)
            .buildTransaction()
            .toPlainObject();
    }
}
