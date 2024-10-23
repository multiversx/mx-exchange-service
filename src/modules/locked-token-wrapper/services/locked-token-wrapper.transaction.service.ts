import { Injectable } from '@nestjs/common';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { TransactionModel } from '../../../models/transaction.model';
import { Address, TokenTransfer } from '@multiversx/sdk-core';
import { mxConfig, gasConfig, scAddress } from '../../../config';
import { BigNumber } from 'bignumber.js';
import { InputTokenModel } from '../../../models/inputToken.model';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { tokenIdentifier } from 'src/utils/token.converters';
import {
    LockedTokenAttributes,
    WrappedLockedTokenAttributes,
} from '@multiversx/sdk-exchange';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';

@Injectable()
export class LockedTokenWrapperTransactionService {
    constructor(
        private readonly energyAbi: EnergyAbiService,
        private readonly mxProxy: MXProxyService,
        private readonly mxApi: MXApiService,
        private readonly contextGetter: ContextGetterService,
    ) {}

    async unwrapLockedToken(
        sender: string,
        inputToken: InputTokenModel,
    ): Promise<TransactionModel> {
        const [currentEpoch, lockedTokenID, wrappedLockedTokenAttributesRaw] =
            await Promise.all([
                this.contextGetter.getCurrentEpoch(),
                this.energyAbi.lockedTokenID(),
                this.mxApi.getNftAttributesByTokenIdentifier(
                    sender,
                    tokenIdentifier(inputToken.tokenID, inputToken.nonce),
                ),
            ]);

        const wrappedLockedTokenAttributes =
            WrappedLockedTokenAttributes.fromAttributes(
                wrappedLockedTokenAttributesRaw,
            );
        const LockedTokenAttributesRaw =
            await this.mxApi.getNftAttributesByTokenIdentifier(
                scAddress.lockedTokenWrapper,
                tokenIdentifier(
                    lockedTokenID,
                    wrappedLockedTokenAttributes.lockedTokenNonce,
                ),
            );

        const lockedTokenAttributes = LockedTokenAttributes.fromAttributes(
            LockedTokenAttributesRaw,
        );

        console.log({
            currentEpoch,
            lockedTokenID,
            wrappedLockedTokenAttributes,
            lockedTokenAttributes,
        });

        if (currentEpoch >= lockedTokenAttributes.unlockEpoch) {
            throw new Error('Cannot unwrap token after unlock epoch');
        }

        const contract = await this.mxProxy.getLockedTokenWrapperContract();
        return contract.methodsExplicit
            .unwrapLockedToken()
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    inputToken.tokenID,
                    inputToken.nonce,
                    new BigNumber(inputToken.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasConfig.lockedTokenWrapper.unwrapLockedToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async wrapLockedToken(
        sender: string,
        inputToken: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getLockedTokenWrapperContract();
        return contract.methodsExplicit
            .wrapLockedToken()
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    inputToken.tokenID,
                    inputToken.nonce,
                    new BigNumber(inputToken.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasConfig.lockedTokenWrapper.wrapLockedToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}
