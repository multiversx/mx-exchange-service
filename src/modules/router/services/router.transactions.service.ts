import { LockedTokenAttributes } from '@multiversx/sdk-exchange';
import {
    Address,
    AddressValue,
    BigUIntValue,
    BooleanValue,
    BytesValue,
    Token,
    TokenIdentifierValue,
    TokenTransfer,
    TypedValue,
    VariadicValue,
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
import { TransactionOptions } from 'src/modules/common/transaction.options';

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
        const pairAddress = await this.getPairAddressByTokens(
            firstTokenID,
            secondTokenID,
        );

        if (pairAddress) {
            throw new Error('Pair already exists');
        }

        return this.mxProxy.getRouterSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.router.createPair,
                function: 'createPair',
                arguments: [
                    BytesValue.fromUTF8(firstTokenID),
                    BytesValue.fromUTF8(secondTokenID),
                    new AddressValue(Address.newFromBech32(sender)),
                ],
            }),
        );
    }

    async upgradePair(
        sender: string,
        firstTokenID: string,
        secondTokenID: string,
        fees: number[],
    ): Promise<TransactionModel> {
        const pairAddress = await this.getPairAddressByTokens(
            firstTokenID,
            secondTokenID,
        );

        if (!pairAddress) {
            throw new Error('Pair does not exist');
        }

        const initialLiquidityAdder = await this.pairAbi.initialLiquidityAdder(
            pairAddress,
        );

        if (sender !== initialLiquidityAdder) {
            throw new Error('Invalid sender address');
        }

        const endpointArgs: TypedValue[] = [
            BytesValue.fromUTF8(firstTokenID),
            BytesValue.fromUTF8(secondTokenID),
            new AddressValue(Address.newFromBech32(initialLiquidityAdder)),
        ];

        for (const fee of fees) {
            endpointArgs.push(new BigUIntValue(new BigNumber(fee)));
        }

        return this.mxProxy.getRouterSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.router.admin.upgradePair,
                function: 'upgradePair',
                arguments: endpointArgs,
            }),
        );
    }

    async removePair(
        sender: string,
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<TransactionModel> {
        const pairAddress = await this.getPairAddressByTokens(
            firstTokenID,
            secondTokenID,
        );

        if (!pairAddress) {
            throw new Error('Pair does not exist');
        }

        return this.mxProxy.getRouterSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.router.admin.removePair,
                function: 'removePair',
                arguments: [
                    BytesValue.fromUTF8(firstTokenID),
                    BytesValue.fromUTF8(secondTokenID),
                ],
            }),
        );
    }

    async issueLpToken(
        sender: string,
        pairAddress: string,
        lpTokenName: string,
        lpTokenTicker: string,
    ): Promise<TransactionModel> {
        const lpTokeID = await this.pairAbi.lpTokenID(pairAddress);
        if (lpTokeID !== undefined) {
            throw new Error('LP Token already issued');
        }

        return this.mxProxy.getRouterSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.router.issueToken,
                function: 'issueLpToken',
                arguments: [
                    new AddressValue(Address.newFromBech32(pairAddress)),
                    BytesValue.fromUTF8(lpTokenName),
                    BytesValue.fromUTF8(lpTokenTicker),
                ],
                nativeTransferAmount: BigInt(
                    constantsConfig.ISSUE_LP_TOKEN_COST,
                ).toString(),
            }),
        );
    }

    async setLocalRoles(
        sender: string,
        pairAddress: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getRouterSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.router.setLocalRoles,
                function: 'setLocalRoles',
                arguments: [BytesValue.fromHex(new Address(pairAddress).hex())],
            }),
        );
    }

    async setLocalRolesOwner(
        sender: string,
        args: SetLocalRoleOwnerArgs,
    ): Promise<TransactionModel> {
        return this.mxProxy.getRouterSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.router.admin.setLocalRolesOwner,
                function: 'setLocalRolesOwner',
                arguments: [
                    BytesValue.fromUTF8(args.tokenID),
                    new AddressValue(Address.newFromBech32(args.address)),
                    VariadicValue.fromItems(
                        ...args.roles.map(
                            (role) => new BigUIntValue(new BigNumber(role)),
                        ),
                    ),
                ],
            }),
        );
    }

    async setState(
        sender: string,
        address: string,
        enable: boolean,
    ): Promise<TransactionModel> {
        return this.mxProxy.getRouterSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.router.admin.setState,
                function: enable ? 'resume' : 'pause',
                arguments: [new AddressValue(Address.newFromBech32(address))],
            }),
        );
    }

    async setPairCreationEnabled(
        sender: string,
        enable: boolean,
    ): Promise<TransactionModel> {
        return this.mxProxy.getRouterSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.router.admin.setPairCreationEnabled,
                function: 'setPairCreationEnabled',
                arguments: [new BooleanValue(enable)],
            }),
        );
    }

    async setFee(
        sender: string,
        pairAddress: string,
        feeToAddress: string,
        feeTokenID: string,
        enable: boolean,
    ): Promise<TransactionModel> {
        return this.mxProxy.getRouterSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.router.admin.setFee,
                function: enable ? 'setFeeOn' : 'setFeeOff',
                arguments: [
                    new AddressValue(Address.newFromBech32(pairAddress)),
                    new AddressValue(Address.newFromBech32(feeToAddress)),
                    new TokenIdentifierValue(feeTokenID),
                ],
            }),
        );
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

        return this.mxProxy.getRouterSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.router.swapEnableByUser,
                function: 'setSwapEnabledByUser',
                arguments: [
                    new AddressValue(Address.newFromBech32(pairAddress)),
                ],
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: inputTokens.tokenID,
                            nonce: BigInt(inputTokens.nonce),
                        }),
                        amount: BigInt(inputTokens.amount),
                    }),
                ],
            }),
        );
    }

    async clearPairTemporaryOwnerStorage(
        sender: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getRouterSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.router.admin.clearPairTemporaryOwnerStorage,
                function: 'clearPairTemporaryOwnerStorage',
            }),
        );
    }

    async setTemporaryOwnerPeriod(
        sender: string,
        periodBlocks: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getRouterSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.router.admin.setTemporaryOwnerPeriod,
                function: 'setTemporaryOwnerPeriod',
                arguments: [new BigUIntValue(new BigNumber(periodBlocks))],
            }),
        );
    }

    async setPairTemplateAddress(
        sender: string,
        address: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getRouterSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.router.admin.setPairTemplateAddress,
                function: 'setPairTemplateAddress',
                arguments: [new AddressValue(Address.newFromBech32(address))],
            }),
        );
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

    private async getPairAddressByTokens(
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<string> {
        const pairsMetadata = await this.routerAbi.pairsMetadata();
        for (const pair of pairsMetadata) {
            if (
                (pair.firstTokenID === firstTokenID &&
                    pair.secondTokenID === secondTokenID) ||
                (pair.firstTokenID === secondTokenID &&
                    pair.secondTokenID === firstTokenID)
            ) {
                return pair.address;
            }
        }
        return undefined;
    }

    async wrapIfNeeded(
        sender: string,
        tokenID: string,
        amount: string,
    ): Promise<TransactionModel> {
        if (tokenID === mxConfig.EGLDIdentifier) {
            return this.transactionsWrapService.wrapEgld(sender, amount);
        }
    }

    async unwrapIfNeeded(
        sender: string,
        tokenID: string,
        amount: string,
    ): Promise<TransactionModel> {
        if (tokenID === mxConfig.EGLDIdentifier) {
            return this.transactionsWrapService.unwrapEgld(sender, amount);
        }
    }

    private async validateSwapEnableInputTokens(
        inputTokens: InputTokenModel,
    ): Promise<string> {
        const lockedTokensAttributes = LockedTokenAttributes.fromAttributes(
            inputTokens.attributes,
        );
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
                new BigNumber(swapEnableConfig.minLockedTokenValue).minus(
                    constantsConfig.roundedSwapEnable[commonToken],
                ),
            )
        ) {
            throw new Error('Not enough value locked');
        }

        return pairAddress;
    }
}
