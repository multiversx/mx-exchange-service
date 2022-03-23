import {
    Address,
    BigUIntValue,
    BytesValue,
    GasLimit,
    U32Value,
} from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { elrondConfig, gasConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { ContextTransactionsService } from 'src/services/context/context.transactions.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { PriceDiscoveryGetterService } from './price.discovery.getter.service';

@Injectable()
export class PriceDiscoveryTransactionService {
    constructor(
        private readonly priceDiscoveryGetter: PriceDiscoveryGetterService,
        private readonly elrondProxy: ElrondProxyService,
        private readonly contextTransactions: ContextTransactionsService,
        private readonly wrappingService: WrapService,
        private readonly wrappingTransactions: TransactionsWrapService,
    ) {}

    async depositBatch(
        priceDiscoveryAddress: string,
        sender: string,
        inputToken: InputTokenModel,
    ): Promise<TransactionModel[]> {
        const wrappedTokenID = await this.wrappingService.getWrappedEgldTokenID();
        const transactions: TransactionModel[] = [];
        if (inputToken.tokenID === elrondConfig.EGLDIdentifier) {
            transactions.push(
                await this.wrappingTransactions.wrapEgld(
                    sender,
                    inputToken.amount,
                ),
            );
        }
        transactions.push(
            await this.deposit(
                priceDiscoveryAddress,
                new InputTokenModel({
                    tokenID: wrappedTokenID,
                    amount: inputToken.amount,
                }),
            ),
        );

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
        const transactionArgs = [
            BytesValue.fromUTF8(inputToken.tokenID),
            new BigUIntValue(new BigNumber(inputToken.amount)),
            BytesValue.fromUTF8(this.deposit.name),
        ];
        return this.contextTransactions.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.priceDiscovery.deposit),
        );
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

        const transactionArgs = [
            BytesValue.fromUTF8(inputToken.tokenID),
            new U32Value(inputToken.nonce),
            new BigUIntValue(new BigNumber(inputToken.amount)),
            BytesValue.fromHex(new Address(priceDiscoveryAddress).hex()),
            BytesValue.fromUTF8(endpointName),
        ];

        const transaction = this.contextTransactions.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.priceDiscovery.withdraw),
        );

        transaction.receiver = sender;

        return transaction;
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
