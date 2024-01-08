import { Address, AddressValue, TokenTransfer } from '@multiversx/sdk-core/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { gasConfig, mxConfig, scAddress } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { EscrowAbiService } from './escrow.abi.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { tokenIdentifier } from 'src/utils/token.converters';
import { LockedTokenAttributes } from '@multiversx/sdk-exchange';
import { ContextGetterService } from 'src/services/context/context.getter.service';

@Injectable()
export class EscrowTransactionService {
    constructor(
        private readonly escrowAbi: EscrowAbiService,
        private readonly mxProxy: MXProxyService,
        private readonly mxApi: MXApiService,
        private readonly contextGetter: ContextGetterService,
    ) {}

    async withdraw(
        receiverAddress: string,
        senderAddress: string,
    ): Promise<TransactionModel> {
        const currentEpoch = await this.contextGetter.getCurrentEpoch();
        const scheduledTransfers = await this.escrowAbi.scheduledTransfers(
            receiverAddress,
        );
        const scheduledTransfersFromSender = scheduledTransfers.filter(
            (transfer) => transfer.sender === senderAddress,
        );

        const lockedTokensIDs: string[] = [];
        scheduledTransfersFromSender.forEach((transfer) => {
            lockedTokensIDs.push(
                ...transfer.lockedFunds.funds.map((fund) =>
                    tokenIdentifier(fund.tokenIdentifier, fund.tokenNonce),
                ),
            );
        });

        const promises = lockedTokensIDs.map((tokenID) =>
            this.mxApi.getNftAttributesByTokenIdentifier(
                scAddress.escrow,
                tokenID,
            ),
        );

        const lockedTokensAttributes = await Promise.all(promises);

        for (const attributes of lockedTokensAttributes) {
            const decodedAttributes =
                LockedTokenAttributes.fromAttributes(attributes);
            if (currentEpoch >= decodedAttributes.unlockEpoch) {
                throw new Error('Cannot withdraw funds after unlock epoch');
            }
        }

        const contract = await this.mxProxy.getEscrowContract();

        return contract.methodsExplicit
            .withdraw([new AddressValue(Address.fromString(senderAddress))])
            .withChainID(mxConfig.chainID)
            .withGasLimit(gasConfig.escrow.withdraw)
            .buildTransaction()
            .toPlainObject();
    }

    async cancelTransfer(
        senderAddress: string,
        receiverAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getEscrowContract();

        return contract.methodsExplicit
            .cancelTransfer([
                new AddressValue(Address.fromString(senderAddress)),
                new AddressValue(Address.fromString(receiverAddress)),
            ])
            .withChainID(mxConfig.chainID)
            .withGasLimit(gasConfig.escrow.cancelTransfer)
            .buildTransaction()
            .toPlainObject();
    }

    async lockFunds(
        senderAddress: string,
        receiverAddress: string,
        payments: InputTokenModel[],
    ): Promise<TransactionModel> {
        if (senderAddress === receiverAddress) {
            throw new Error('Sender and receiver cannot be the same');
        }

        const contract = await this.mxProxy.getEscrowContract();

        return contract.methodsExplicit
            .lockFunds([new AddressValue(Address.fromString(receiverAddress))])
            .withMultiESDTNFTTransfer(
                payments.map((payment) =>
                    TokenTransfer.metaEsdtFromBigInteger(
                        payment.tokenID,
                        payment.nonce,
                        new BigNumber(payment.amount),
                    ),
                ),
            )
            .withSender(Address.fromString(senderAddress))
            .withChainID(mxConfig.chainID)
            .withGasLimit(gasConfig.escrow.lockFunds)
            .buildTransaction()
            .toPlainObject();
    }
}
