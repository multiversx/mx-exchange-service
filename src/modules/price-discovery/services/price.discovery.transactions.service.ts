import { Token, TokenTransfer } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { mxConfig, gasConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { WrapTransactionsService } from 'src/modules/wrapping/services/wrap.transactions.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { WrapAbiService } from 'src/modules/wrapping/services/wrap.abi.service';
import { PriceDiscoveryAbiService } from './price.discovery.abi.service';
import { TransactionOptions } from 'src/modules/common/transaction.options';

@Injectable()
export class PriceDiscoveryTransactionService {
    constructor(
        private readonly priceDiscoveryAbi: PriceDiscoveryAbiService,
        private readonly mxProxy: MXProxyService,
        private readonly wrapAbi: WrapAbiService,
        private readonly wrappingTransactions: WrapTransactionsService,
    ) {}

    async depositBatch(
        priceDiscoveryAddress: string,
        sender: string,
        inputToken: InputTokenModel,
    ): Promise<TransactionModel[]> {
        const wrappedTokenID = await this.wrapAbi.wrappedEgldTokenID();
        const transactions: TransactionModel[] = [];
        if (inputToken.tokenID === mxConfig.EGLDIdentifier) {
            transactions.push(
                await this.wrappingTransactions.wrapEgld(
                    sender,
                    inputToken.amount,
                ),
            );
            transactions.push(
                await this.deposit(
                    sender,
                    priceDiscoveryAddress,
                    new InputTokenModel({
                        tokenID: wrappedTokenID,
                        amount: inputToken.amount,
                    }),
                ),
            );
        } else {
            transactions.push(
                await this.deposit(sender, priceDiscoveryAddress, inputToken),
            );
        }

        return transactions;
    }

    async deposit(
        sender: string,
        priceDiscoveryAddress: string,
        inputToken: InputTokenModel,
    ): Promise<TransactionModel> {
        await this.validateDepositInputTokens(
            priceDiscoveryAddress,
            inputToken,
        );

        return await this.mxProxy.getPriceDiscoverySmartContractTransaction(
            priceDiscoveryAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.priceDiscovery.deposit,
                function: 'deposit',
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: inputToken.tokenID,
                        }),
                        amount: BigInt(inputToken.amount),
                    }),
                ],
            }),
        );
    }

    async genericBatchRedeemInteraction(
        priceDiscoveryAddress: string,
        sender: string,
        inputToken: InputTokenModel,
        endpointName: string,
    ): Promise<TransactionModel[]> {
        const transactions: TransactionModel[] = [];

        const [currentPhase, acceptedTokenID, wrappedTokenID] =
            await Promise.all([
                this.priceDiscoveryAbi.currentPhase(priceDiscoveryAddress),
                this.priceDiscoveryAbi.acceptedTokenID(priceDiscoveryAddress),
                this.wrapAbi.wrappedEgldTokenID(),
            ]);

        transactions.push(
            await this.genericRedeemInteraction(
                priceDiscoveryAddress,
                sender,
                inputToken,
                endpointName,
            ),
        );

        if (inputToken.nonce === 2 && acceptedTokenID === wrappedTokenID) {
            const wrappedAmount =
                currentPhase.penaltyPercent > 0
                    ? new BigNumber(inputToken.amount).multipliedBy(
                          1 - currentPhase.penaltyPercent,
                      )
                    : new BigNumber(inputToken.amount);
            transactions.push(
                await this.wrappingTransactions.unwrapEgld(
                    sender,
                    wrappedAmount.toFixed(),
                ),
            );
        }

        return transactions;
    }

    async genericRedeemInteraction(
        priceDiscoveryAddress: string,
        sender: string,
        inputToken: InputTokenModel,
        endpointName: string,
    ): Promise<TransactionModel> {
        await this.validateRedeemInputTokens(priceDiscoveryAddress, inputToken);

        return await this.mxProxy.getPriceDiscoverySmartContractTransaction(
            priceDiscoveryAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.priceDiscovery.withdraw,
                function: endpointName,
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: inputToken.tokenID,
                            nonce: BigInt(inputToken.nonce),
                        }),
                        amount: BigInt(inputToken.amount),
                    }),
                ],
            }),
        );
    }

    private async validateDepositInputTokens(
        priceDiscoveryAddress: string,
        inputToken: InputTokenModel,
    ): Promise<void> {
        const [launchedTokenID, acceptedTokenID] = await Promise.all([
            this.priceDiscoveryAbi.launchedTokenID(priceDiscoveryAddress),
            this.priceDiscoveryAbi.acceptedTokenID(priceDiscoveryAddress),
        ]);

        if (
            (inputToken.tokenID !== launchedTokenID &&
                inputToken.tokenID !== acceptedTokenID) ||
            inputToken.nonce > 0
        ) {
            throw new Error('Invalid input tokens');
        }
    }

    private async validateRedeemInputTokens(
        priceDiscoveryAddress: string,
        inputToken: InputTokenModel,
    ): Promise<void> {
        const redeemTokenID = await this.priceDiscoveryAbi.redeemTokenID(
            priceDiscoveryAddress,
        );

        if (
            inputToken.tokenID !== redeemTokenID ||
            inputToken.nonce === 0 ||
            inputToken.nonce > 2
        ) {
            throw new Error('Invalid input tokens');
        }
    }
}
