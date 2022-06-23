import {
    Address,
    AddressValue,
    BigUIntValue,
    BooleanValue,
    BytesValue,
    TokenIdentifierValue,
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
import { SetLocalRoleOwnerArgs } from '../models/router.args';
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

    async upgradePair(
        firstTokenID: string,
        secondTokenID: string,
        fees: number[],
    ): Promise<TransactionModel> {
        const checkPairExists = await this.checkPairExists(
            firstTokenID,
            secondTokenID,
        );

        if (!checkPairExists) {
            throw new Error('Pair does not exist');
        }

        const contract = await this.elrondProxy.getRouterSmartContract();
        const endpointArgs: TypedValue[] = [
            BytesValue.fromUTF8(firstTokenID),
            BytesValue.fromUTF8(secondTokenID),
        ];

        for (const fee of fees) {
            endpointArgs.push(new BigUIntValue(new BigNumber(fee)));
        }

        return contract.methodsExplicit
            .upgradePair(endpointArgs)
            .withGasLimit(gasConfig.router.admin.upgradePair)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async removePair(
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<TransactionModel> {
        const checkPairExists = await this.checkPairExists(
            firstTokenID,
            secondTokenID,
        );

        if (!checkPairExists) {
            throw new Error('Pair does not exist');
        }

        const contract = await this.elrondProxy.getRouterSmartContract();
        const endpointArgs: TypedValue[] = [
            BytesValue.fromUTF8(firstTokenID),
            BytesValue.fromUTF8(secondTokenID),
        ];
        return contract.methodsExplicit
            .removePair(endpointArgs)
            .withGasLimit(gasConfig.router.admin.removePair)
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
        if (lpTokeID !== 'undefined' && lpTokeID !== undefined) {
            throw new Error('LP Token already issued');
        }

        const contract = await this.elrondProxy.getRouterSmartContract();
        return contract.methodsExplicit
            .issueLpToken([
                new AddressValue(Address.fromString(pairAddress)),
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

    async setLocalRolesOwner(
        args: SetLocalRoleOwnerArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const endpointArgs: TypedValue[] = [
            BytesValue.fromUTF8(args.tokenID),
            BytesValue.fromHex(new Address(args.address).hex()),
        ];
        for (const role of args.roles) {
            endpointArgs.push(...[new BigUIntValue(new BigNumber(role))]);
        }
        return contract.methodsExplicit
            .setLocalRolesOwner(endpointArgs)
            .withGasLimit(gasConfig.router.admin.setLocalRolesOwner)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setState(
        address: string,
        enable: boolean,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const args = [new AddressValue(Address.fromString(address))];

        const interaction = enable
            ? contract.methodsExplicit.resume(args)
            : contract.methodsExplicit.pause(args);

        return interaction
            .withGasLimit(gasConfig.router.admin.setState)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setPairCreationEnabled(enable: boolean): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        return contract.methodsExplicit
            .setPairCreationEnabled([new BooleanValue(enable)])
            .withGasLimit(gasConfig.router.admin.setPairCreationEnabled)
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
        const args: TypedValue[] = [
            new AddressValue(Address.fromString(pairAddress)),
            new AddressValue(Address.fromString(feeToAddress)),
            new TokenIdentifierValue(feeTokenID),
        ];

        const interaction = enable
            ? contract.methodsExplicit.setFeeOn(args)
            : contract.methodsExplicit.setFeeOff(args);

        return interaction
            .withGasLimit(gasConfig.router.admin.setFee)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async clearPairTemporaryOwnerStorage(): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        return contract.methodsExplicit
            .clearPairTemporaryOwnerStorage()
            .withGasLimit(gasConfig.router.admin.clearPairTemporaryOwnerStorage)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setTemporaryOwnerPeriod(
        periodBlocks: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        return contract.methodsExplicit
            .setTemporaryOwnerPeriod([
                new BigUIntValue(new BigNumber(periodBlocks)),
            ])
            .withGasLimit(gasConfig.router.admin.setTemporaryOwnerPeriod)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setPairTemplateAddress(address: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        return contract.methodsExplicit
            .setPairTemplateAddress([
                new AddressValue(Address.fromString(address)),
            ])
            .withGasLimit(gasConfig.router.admin.setPairTemplateAddress)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
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

    async wrapIfNeeded(
        sender: string,
        tokenID: string,
        amount: string,
    ): Promise<TransactionModel> {
        if (tokenID === elrondConfig.EGLDIdentifier) {
            return await this.transactionsWrapService.wrapEgld(sender, amount);
        }
    }

    async unwrapIfNeeded(
        sender: string,
        tokenID: string,
        amount: string,
    ): Promise<TransactionModel> {
        if (tokenID === elrondConfig.EGLDIdentifier) {
            return await this.transactionsWrapService.unwrapEgld(
                sender,
                amount,
            );
        }
    }
}
