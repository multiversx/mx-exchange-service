import { LockedTokenAttributes } from '@multiversx/sdk-exchange';
import {
    Address,
    AddressValue,
    BigUIntValue,
    BooleanValue,
    BytesValue,
    TokenIdentifierValue,
    TokenTransfer,
    TypedValue,
} from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { InputTokenModel } from 'src/models/inputToken.model';
import { MultiSwapTokensArgs } from 'src/modules/auto-router/models/multi-swap-tokens.args';
import { PairService } from 'src/modules/pair/services/pair.service';
import { WrapTransactionsService } from 'src/modules/wrapping/services/wrap.transactions.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { constantsConfig, mxConfig, gasConfig } from '../../../config';
import { TransactionModel } from '../../../models/transaction.model';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { SetLocalRoleOwnerArgs } from '../models/router.args';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { RouterAbiService } from './router.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';

@Injectable()
export class RouterTransactionService {
    constructor(
        private readonly mxProxy: MXProxyService,
        private readonly pairAbi: PairAbiService,
        private readonly routerAbi: RouterAbiService,
        private readonly pairService: PairService,
        private readonly contextGetter: ContextGetterService,
        private readonly transactionsWrapService: WrapTransactionsService,
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

        const contract = await this.mxProxy.getRouterSmartContract();

        return contract.methodsExplicit
            .createPair([
                BytesValue.fromUTF8(firstTokenID),
                BytesValue.fromUTF8(secondTokenID),
                new AddressValue(Address.fromString(sender)),
            ])
            .withGasLimit(gasConfig.router.createPair)
            .withChainID(mxConfig.chainID)
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

        const contract = await this.mxProxy.getRouterSmartContract();
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
            .withChainID(mxConfig.chainID)
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

        const contract = await this.mxProxy.getRouterSmartContract();
        const endpointArgs: TypedValue[] = [
            BytesValue.fromUTF8(firstTokenID),
            BytesValue.fromUTF8(secondTokenID),
        ];
        return contract.methodsExplicit
            .removePair(endpointArgs)
            .withGasLimit(gasConfig.router.admin.removePair)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async issueLpToken(
        pairAddress: string,
        lpTokenName: string,
        lpTokenTicker: string,
    ): Promise<TransactionModel> {
        const lpTokeID = await this.pairAbi.lpTokenID(pairAddress);
        if (lpTokeID !== undefined) {
            throw new Error('LP Token already issued');
        }

        const contract = await this.mxProxy.getRouterSmartContract();
        return contract.methodsExplicit
            .issueLpToken([
                new AddressValue(Address.fromString(pairAddress)),
                BytesValue.fromUTF8(lpTokenName),
                BytesValue.fromUTF8(lpTokenTicker),
            ])
            .withValue(constantsConfig.ISSUE_LP_TOKEN_COST)
            .withGasLimit(gasConfig.router.issueToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setLocalRoles(pairAddress: string): Promise<TransactionModel> {
        const contract = await this.mxProxy.getRouterSmartContract();
        return contract.methodsExplicit
            .setLocalRoles([BytesValue.fromHex(new Address(pairAddress).hex())])
            .withGasLimit(gasConfig.router.setLocalRoles)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setLocalRolesOwner(
        args: SetLocalRoleOwnerArgs,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const endpointArgs: TypedValue[] = [
            BytesValue.fromUTF8(args.tokenID),
            new AddressValue(Address.fromString(args.address)),
        ];
        for (const role of args.roles) {
            endpointArgs.push(...[new BigUIntValue(new BigNumber(role))]);
        }
        return contract.methodsExplicit
            .setLocalRolesOwner(endpointArgs)
            .withGasLimit(gasConfig.router.admin.setLocalRolesOwner)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setState(
        address: string,
        enable: boolean,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getRouterSmartContract();
        const args = [new AddressValue(Address.fromString(address))];

        const interaction = enable
            ? contract.methodsExplicit.resume(args)
            : contract.methodsExplicit.pause(args);

        return interaction
            .withGasLimit(gasConfig.router.admin.setState)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setPairCreationEnabled(enable: boolean): Promise<TransactionModel> {
        const contract = await this.mxProxy.getRouterSmartContract();
        return contract.methodsExplicit
            .setPairCreationEnabled([new BooleanValue(enable)])
            .withGasLimit(gasConfig.router.admin.setPairCreationEnabled)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setFee(
        pairAddress: string,
        feeToAddress: string,
        feeTokenID: string,
        enable: boolean,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getRouterSmartContract();
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
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async setSwapEnabledByUser(
        sender: string,
        inputTokens: InputTokenModel,
    ): Promise<TransactionModel> {
        const pairAddress = await this.validateSwapEnableInputTokens(
            inputTokens,
        );

        const initialLiquidityAdder = await this.pairAbi.initialLiquidityAdder(
            pairAddress,
        );
        if (sender !== initialLiquidityAdder) {
            throw new Error('Invalid sender address');
        }

        const contract = await this.mxProxy.getRouterSmartContract();
        return contract.methodsExplicit
            .setSwapEnabledByUser([
                new AddressValue(Address.fromString(pairAddress)),
            ])
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    inputTokens.tokenID,
                    inputTokens.nonce,
                    new BigNumber(inputTokens.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasConfig.router.swapEnableByUser)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async clearPairTemporaryOwnerStorage(): Promise<TransactionModel> {
        const contract = await this.mxProxy.getRouterSmartContract();
        return contract.methodsExplicit
            .clearPairTemporaryOwnerStorage()
            .withGasLimit(gasConfig.router.admin.clearPairTemporaryOwnerStorage)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setTemporaryOwnerPeriod(
        periodBlocks: string,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getRouterSmartContract();
        return contract.methodsExplicit
            .setTemporaryOwnerPeriod([
                new BigUIntValue(new BigNumber(periodBlocks)),
            ])
            .withGasLimit(gasConfig.router.admin.setTemporaryOwnerPeriod)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setPairTemplateAddress(address: string): Promise<TransactionModel> {
        const contract = await this.mxProxy.getRouterSmartContract();
        return contract.methodsExplicit
            .setPairTemplateAddress([
                new AddressValue(Address.fromString(address)),
            ])
            .withGasLimit(gasConfig.router.admin.setPairTemplateAddress)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async multiPairSwap(
        sender: string,
        args: MultiSwapTokensArgs,
    ): Promise<TransactionModel[]> {
        const transactions = [];
        const contract = await this.mxProxy.getRouterSmartContract();

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
                    new AddressValue(Address.fromString(address)),
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
                    TokenTransfer.fungibleFromBigInteger(
                        args.tokenRoute[0],
                        args.intermediaryAmounts[0],
                    ),
                )
                .withGasLimit(
                    args.addressRoute.length *
                        gasConfig.router.multiPairSwapMultiplier,
                )
                .withChainID(mxConfig.chainID)
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
        const pairsMetadata = await this.routerAbi.pairsMetadata();
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
        if (tokenID === mxConfig.EGLDIdentifier) {
            return await this.transactionsWrapService.wrapEgld(sender, amount);
        }
    }

    async unwrapIfNeeded(
        sender: string,
        tokenID: string,
        amount: string,
    ): Promise<TransactionModel> {
        if (tokenID === mxConfig.EGLDIdentifier) {
            return await this.transactionsWrapService.unwrapEgld(
                sender,
                amount,
            );
        }
    }

    private async validateSwapEnableInputTokens(
        inputTokens: InputTokenModel,
    ): Promise<string> {
        const lockedTokensAttributes = LockedTokenAttributes.fromAttributes(
            inputTokens.attributes,
        );
        console.log(lockedTokensAttributes);
        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            lockedTokensAttributes.originalTokenID,
        );
        if (!pairAddress) {
            throw new Error('Invalid locked LP token');
        }

        const [
            firstTokenID,
            secondTokenID,
            liquidityTokens,
            commonTokensUserPair,
        ] = await Promise.all([
            this.pairAbi.firstTokenID(pairAddress),
            this.pairAbi.secondTokenID(pairAddress),
            this.pairService.getLiquidityPosition(
                pairAddress,
                inputTokens.amount,
            ),
            this.routerAbi.commonTokensForUserPairs(),
        ]);

        let commonToken: string;
        if (commonTokensUserPair.includes(firstTokenID)) {
            commonToken = firstTokenID;
        } else if (commonTokensUserPair.includes(secondTokenID)) {
            commonToken = secondTokenID;
        } else {
            throw new Error('Not a valid user defined pair');
        }

        const [swapEnableConfig, currentEpoch] = await Promise.all([
            this.routerAbi.enableSwapByUserConfig(commonToken),
            this.contextGetter.getCurrentEpoch(),
        ]);

        if (inputTokens.tokenID !== swapEnableConfig.lockedTokenID) {
            throw new Error('Invalid input token');
        }

        const lpTokenLockedEpochs =
            currentEpoch < lockedTokensAttributes.unlockEpoch
                ? lockedTokensAttributes.unlockEpoch - currentEpoch
                : 0;
        if (!(lpTokenLockedEpochs >= swapEnableConfig.minLockPeriodEpochs)) {
            throw new Error('Token not locked for long enough');
        }

        let commonTokenValue: string;
        if (commonTokensUserPair.includes(firstTokenID)) {
            commonTokenValue = liquidityTokens.firstTokenAmount;
        } else if (commonTokensUserPair.includes(secondTokenID)) {
            commonTokenValue = liquidityTokens.secondTokenAmount;
        } else {
            throw new Error('Not a valid user defined pair');
        }
        if (
            new BigNumber(commonTokenValue).isLessThan(
                swapEnableConfig.minLockedTokenValue,
            )
        ) {
            throw new Error('Not enough value locked');
        }

        return pairAddress;
    }
}
