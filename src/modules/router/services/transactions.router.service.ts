import {
    Address,
    BigUIntValue,
    BytesValue,
    TokenPayment,
    TypedValue,
} from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { MultiSwapTokensArgs } from 'src/modules/auto-router/models/multi-swap-tokens.args';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { constantsConfig, elrondConfig, gasConfig } from '../../../config';
import { TransactionModel } from '../../../models/transaction.model';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { RouterGetterService } from './router.getter.service';

@Injectable()
export class TransactionRouterService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly routerGetterService: RouterGetterService,
        private readonly pairGetterService: PairGetterService,
        private readonly transactionsWrapService: TransactionsWrapService,
    ) {}

    async createPair(
        sender: string,
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<TransactionModel> {
        const checkPairExists = await this.checkPairExists(
            firstTokenID,
            secondTokenID,
        );

        if (checkPairExists) {
            throw new Error('Pair already exists');
        }

        const contract = await this.elrondProxy.getRouterSmartContract();

        return contract.methodsExplicit
            .createPair([
                BytesValue.fromUTF8(firstTokenID),
                BytesValue.fromUTF8(secondTokenID),
                BytesValue.fromHex(Address.fromString(sender).hex()),
            ])
            .withGasLimit(gasConfig.router.createPair)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async issueLpToken(
        pairAddress: string,
        lpTokenName: string,
        lpTokenTicker: string,
    ): Promise<TransactionModel> {
        const lpTokeID = await this.pairGetterService.getLpTokenID(pairAddress);
        if (lpTokeID !== 'undefined') {
            throw new Error('LP Token already issued');
        }

        const contract = await this.elrondProxy.getRouterSmartContract();
        return contract.methodsExplicit
            .issueLpToken([
                BytesValue.fromHex(new Address(pairAddress).hex()),
                BytesValue.fromUTF8(lpTokenName),
                BytesValue.fromUTF8(lpTokenTicker),
            ])
            .withValue(constantsConfig.ISSUE_LP_TOKEN_COST)
            .withGasLimit(gasConfig.router.issueToken)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setLocalRoles(pairAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        return contract.methodsExplicit
            .setLocalRoles([BytesValue.fromHex(new Address(pairAddress).hex())])
            .withGasLimit(gasConfig.router.setLocalRoles)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setState(
        address: string,
        enable: boolean,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const args = [BytesValue.fromHex(new Address(address).hex())];

        const interaction = enable
            ? contract.methodsExplicit.resume(args)
            : contract.methodsExplicit.pause(args);

        return interaction
            .withGasLimit(gasConfig.router.setState)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setFee(
        pairAddress: string,
        feeToAddress: string,
        feeTokenID: string,
        enable: boolean,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const args = [
            BytesValue.fromHex(new Address(pairAddress).hex()),
            BytesValue.fromHex(new Address(feeToAddress).hex()),
            BytesValue.fromUTF8(feeTokenID),
        ];

        const interaction = enable
            ? contract.methodsExplicit.setFeeOn(args)
            : contract.methodsExplicit.setFeeOff(args);

        return interaction
            .withGasLimit(gasConfig.router.setFee)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    private async checkPairExists(
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<boolean> {
        const pairsMetadata = await this.routerGetterService.getPairsMetadata();
        for (const pair of pairsMetadata) {
            if (
                (pair.firstTokenID === firstTokenID &&
                    pair.secondTokenID === secondTokenID) ||
                (pair.firstTokenID === secondTokenID &&
                    pair.secondTokenID === firstTokenID)
            ) {
                return true;
            }
        }
        return false;
    }

    async multiPairSwap(
        sender: string,
        args: MultiSwapTokensArgs,
    ): Promise<TransactionModel[]> {
        const transactions = [];
        const contract = await this.elrondProxy.getRouterSmartContract();

        const wrapTransaction = await this.wrapIfNeeded(
            sender,
            args.tokenInID,
            args.intermediaryAmounts[0],
        );
        if (wrapTransaction) transactions.push(wrapTransaction);

        const endpointArgs: TypedValue[] = [];
        for (const [index, address] of args.addressRoute.entries()) {
            const amountOutMin = new BigNumber(1)
                .dividedBy(new BigNumber(1).plus(args.tolerance))
                .multipliedBy(args.intermediaryAmounts[index + 1])
                .integerValue();
            endpointArgs.push(
                ...[
                    BytesValue.fromHex(Address.fromString(address).hex()),
                    BytesValue.fromUTF8('swapTokensFixedInput'),
                    BytesValue.fromUTF8(args.tokenRoute[index + 1]),
                    new BigUIntValue(amountOutMin),
                ],
            );
        }

        transactions.push(
            contract.methodsExplicit
                .multiPairSwap(endpointArgs)
                .withSingleESDTTransfer(
                    TokenPayment.fungibleFromBigInteger(
                        args.tokenRoute[0],
                        args.intermediaryAmounts[0],
                    ),
                )
                .withGasLimit(
                    args.addressRoute.length *
                        gasConfig.router.multiPairSwapMultiplier,
                )
                .withChainID(elrondConfig.chainID)
                .buildTransaction()
                .toPlainObject(),
        );

        const unwrapTransaction = await this.unwrapIfNeeded(
            sender,
            args.tokenOutID,
            args.intermediaryAmounts[args.intermediaryAmounts.length - 1],
        );
        if (unwrapTransaction) transactions.push(unwrapTransaction);

        return transactions;
    }

    async wrapIfNeeded(sender, tokenID, amount): Promise<TransactionModel> {
        if (tokenID === elrondConfig.EGLDIdentifier) {
            return await this.transactionsWrapService.wrapEgld(sender, amount);
        }
    }

    async unwrapIfNeeded(sender, tokenID, amount): Promise<TransactionModel> {
        if (tokenID === elrondConfig.EGLDIdentifier) {
            return await this.transactionsWrapService.unwrapEgld(
                sender,
                amount,
            );
        }
    }
}
