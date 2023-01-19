import { Address, Interaction, TokenPayment } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { mxConfig, gasConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { PriceDiscoveryGetterService } from './price.discovery.getter.service';

@Injectable()
export class PriceDiscoveryTransactionService {
    constructor(
        private readonly priceDiscoveryGetter: PriceDiscoveryGetterService,
        private readonly elrondProxy: ElrondProxyService,
        private readonly wrappingService: WrapService,
        private readonly wrappingTransactions: TransactionsWrapService,
    ) {}

    async depositBatch(
        priceDiscoveryAddress: string,
        sender: string,
        inputToken: InputTokenModel,
    ): Promise<TransactionModel[]> {
        const wrappedTokenID =
            await this.wrappingService.getWrappedEgldTokenID();
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
                    priceDiscoveryAddress,
                    new InputTokenModel({
                        tokenID: wrappedTokenID,
                        amount: inputToken.amount,
                    }),
                ),
            );
        } else {
            transactions.push(
                await this.deposit(priceDiscoveryAddress, inputToken),
            );
        }

        return transactions;
    }

    async deposit(
        priceDiscoveryAddress: string,
        inputToken: InputTokenModel,
    ): Promise<TransactionModel> {
        await this.validateDepositInputTokens(
            priceDiscoveryAddress,
            inputToken,
        );

        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );

        return contract.methodsExplicit
            .deposit()
            .withSingleESDTTransfer(
                TokenPayment.fungibleFromBigInteger(
                    inputToken.tokenID,
                    new BigNumber(inputToken.amount),
                ),
            )
            .withGasLimit(gasConfig.priceDiscovery.deposit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
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
                this.priceDiscoveryGetter.getCurrentPhase(
                    priceDiscoveryAddress,
                ),
                this.priceDiscoveryGetter.getAcceptedTokenID(
                    priceDiscoveryAddress,
                ),
                this.wrappingService.getWrappedEgldTokenID(),
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

        const contract = await this.elrondProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );

        let interaction: Interaction;
        switch (endpointName) {
            case 'redeem':
                interaction = contract.methodsExplicit.redeem();
                break;
            case 'withdraw':
                interaction = contract.methodsExplicit.withdraw();
                break;
        }

        return interaction
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    inputToken.tokenID,
                    inputToken.nonce,
                    new BigNumber(inputToken.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasConfig.priceDiscovery.withdraw)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    private async validateDepositInputTokens(
        priceDiscoveryAddress: string,
        inputToken: InputTokenModel,
    ): Promise<void> {
        const [launchedTokenID, acceptedTokenID] = await Promise.all([
            this.priceDiscoveryGetter.getLaunchedTokenID(priceDiscoveryAddress),
            this.priceDiscoveryGetter.getAcceptedTokenID(priceDiscoveryAddress),
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
        const redeemTokenID = await this.priceDiscoveryGetter.getRedeemTokenID(
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
