import { Injectable } from '@nestjs/common';
import { constantsConfig, mxConfig, gasConfig } from 'src/config';
import {
    BigUIntValue,
    BytesValue,
    TypedValue,
    U64Value,
} from '@multiversx/sdk-core/out/smartcontracts/typesystem';
import { Address, TokenTransfer } from '@multiversx/sdk-core';
import { TransactionModel } from 'src/models/transaction.model';
import BigNumber from 'bignumber.js';
import { PairService } from 'src/modules/pair/services/pair.service';
import {
    AddLiquidityProxyArgs,
    RemoveLiquidityProxyArgs,
} from '../../models/proxy-pair.args';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { WrapTransactionsService } from 'src/modules/wrapping/services/wrap.transactions.service';
import { InputTokenModel } from 'src/models/inputToken.model';
import { WrapAbiService } from 'src/modules/wrapping/services/wrap.abi.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { ProxyAbiServiceV2 } from 'src/modules/proxy/v2/services/proxy.v2.abi.service';

@Injectable()
export class ProxyPairTransactionsService {
    constructor(
        private readonly proxyAbiV2: ProxyAbiServiceV2,
        private readonly mxProxy: MXProxyService,
        private readonly pairService: PairService,
        private readonly pairAbi: PairAbiService,
        private readonly wrapAbi: WrapAbiService,
        private readonly wrapTransaction: WrapTransactionsService,
    ) {}

    async addLiquidityProxyBatch(
        sender: string,
        proxyAddress: string,
        args: AddLiquidityProxyArgs,
    ): Promise<TransactionModel[]> {
        const transactions: TransactionModel[] = [];

        switch (mxConfig.EGLDIdentifier) {
            case args.tokens[0].tokenID:
                transactions.push(
                    await this.wrapTransaction.wrapEgld(
                        sender,
                        args.tokens[0].amount,
                    ),
                );
                break;
            case args.tokens[1].tokenID:
                transactions.push(
                    await this.wrapTransaction.wrapEgld(
                        sender,
                        args.tokens[1].amount,
                    ),
                );
                break;
            default:
                throw new Error('No EGLD to wrap found!');
        }

        transactions.push(
            await this.addLiquidityProxy(sender, proxyAddress, args),
        );

        return transactions;
    }

    @ErrorLoggerAsync()
    async addLiquidityProxy(
        sender: string,
        proxyAddress: string,
        args: AddLiquidityProxyArgs,
    ): Promise<TransactionModel> {
        let liquidityTokens: InputTokenModel[];
        liquidityTokens = await this.convertInputTokenstoESDTTokens(
            args.tokens,
        );
        liquidityTokens = await this.getLiquidityTokens(
            args.pairAddress,
            liquidityTokens,
            proxyAddress,
        );

        const contract = await this.mxProxy.getProxyDexSmartContract(
            proxyAddress,
        );
        const amount0 = new BigNumber(liquidityTokens[0].amount);
        const amount1 = new BigNumber(liquidityTokens[1].amount);

        const amount0Min = amount0
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = amount1
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const endpointArgs: TypedValue[] = [
            BytesValue.fromHex(new Address(args.pairAddress).hex()),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        const gasLimit =
            liquidityTokens.length > 2
                ? gasConfig.proxy.pairs.addLiquidity.withTokenMerge
                : gasConfig.proxy.pairs.addLiquidity.default;
        const mappedPayments: TokenTransfer[] = liquidityTokens.map(
            (inputToken) =>
                TokenTransfer.metaEsdtFromBigInteger(
                    inputToken.tokenID,
                    inputToken.nonce,
                    new BigNumber(inputToken.amount),
                ),
        );

        return contract.methodsExplicit
            .addLiquidityProxy(endpointArgs)
            .withMultiESDTNFTTransfer(mappedPayments)
            .withSender(Address.fromString(sender))
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async removeLiquidityProxy(
        sender: string,
        proxyAddress: string,
        args: RemoveLiquidityProxyArgs,
    ): Promise<TransactionModel[]> {
        const transactions = [];
        const [
            wrappedTokenID,
            firstTokenID,
            secondTokenID,
            liquidityPosition,
            contract,
        ] = await Promise.all([
            this.wrapAbi.wrappedEgldTokenID(),
            this.pairAbi.firstTokenID(args.pairAddress),
            this.pairAbi.secondTokenID(args.pairAddress),
            this.pairService.getLiquidityPosition(
                args.pairAddress,
                args.liquidity,
            ),
            this.mxProxy.getProxyDexSmartContract(proxyAddress),
        ]);
        const amount0Min = new BigNumber(
            liquidityPosition.firstTokenAmount.toString(),
        )
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = new BigNumber(
            liquidityPosition.secondTokenAmount.toString(),
        )
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const endpointArgs = [
            BytesValue.fromHex(new Address(args.pairAddress).hex()),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        transactions.push(
            contract.methodsExplicit
                .removeLiquidityProxy(endpointArgs)
                .withSingleESDTNFTTransfer(
                    TokenTransfer.metaEsdtFromBigInteger(
                        args.wrappedLpTokenID,
                        args.wrappedLpTokenNonce,
                        new BigNumber(args.liquidity),
                    ),
                )
                .withSender(Address.fromString(sender))
                .withGasLimit(gasConfig.proxy.pairs.removeLiquidity)
                .withChainID(mxConfig.chainID)
                .buildTransaction()
                .toPlainObject(),
        );

        switch (wrappedTokenID) {
            case firstTokenID:
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        sender,
                        amount0Min.toFixed(),
                    ),
                );
                break;
            case secondTokenID:
                transactions.push(
                    await this.wrapTransaction.unwrapEgld(
                        sender,
                        amount1Min.toFixed(),
                    ),
                );
        }

        return transactions;
    }

    async mergeWrappedLPTokens(
        sender: string,
        proxyAddress: string,
        tokens: InputTokenModel[],
    ): Promise<TransactionModel> {
        if (
            gasConfig.defaultMergeWLPT * tokens.length >
            constantsConfig.MAX_GAS_LIMIT
        ) {
            throw new Error('Number of merge tokens exeeds maximum gas limit!');
        }

        const contract = await this.mxProxy.getProxyDexSmartContract(
            proxyAddress,
        );
        const gasLimit = gasConfig.proxy.pairs.defaultMergeWLPT * tokens.length;
        const mappedPayments = tokens.map((token) =>
            TokenTransfer.metaEsdtFromBigInteger(
                token.tokenID,
                token.nonce,
                new BigNumber(token.amount),
            ),
        );

        return contract.methodsExplicit
            .mergeWrappedLpTokens()
            .withMultiESDTNFTTransfer(mappedPayments)
            .withSender(Address.fromString(sender))
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async increaseProxyPairTokenEnergy(
        sender: string,
        proxyAddress: string,
        payment: InputTokenModel,
        lockEpochs: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getProxyDexSmartContract(
            proxyAddress,
        );
        return contract.methodsExplicit
            .increaseProxyPairTokenEnergy([
                new U64Value(new BigNumber(lockEpochs)),
            ])
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    payment.tokenID,
                    payment.nonce,
                    new BigNumber(payment.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasConfig.proxy.pairs.increaseEnergy)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    private async convertInputTokenstoESDTTokens(
        tokens: InputTokenModel[],
    ): Promise<InputTokenModel[]> {
        const wrappedTokenID = await this.wrapAbi.wrappedEgldTokenID();

        switch (mxConfig.EGLDIdentifier) {
            case tokens[0].tokenID:
                if (tokens[0].nonce > 0) {
                    throw new Error('Invalid nonce for EGLD token!');
                }
                return [
                    new InputTokenModel({
                        tokenID: wrappedTokenID,
                        nonce: 0,
                        amount: tokens[0].amount,
                    }),
                    ...tokens.slice(1),
                ];
            case tokens[1].tokenID:
                if (tokens[1].nonce > 0) {
                    throw new Error('Invalid nonce for EGLD token!');
                }
                return [
                    tokens[0],
                    new InputTokenModel({
                        tokenID: wrappedTokenID,
                        nonce: 0,
                        amount: tokens[1].amount,
                    }),
                    ...tokens.slice(2),
                ];
            default:
                return tokens;
        }
    }

    private async getLiquidityTokens(
        pairAddress: string,
        tokens: InputTokenModel[],
        proxyAddress: string,
    ): Promise<InputTokenModel[]> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairAbi.firstTokenID(pairAddress),
            this.proxyAbiV2.lockedAssetTokenID(proxyAddress),
        ]);

        switch (firstTokenID) {
            case tokens[0].tokenID:
                if (!secondTokenID.includes(tokens[1].tokenID)) {
                    throw new Error('Invalid tokens received!');
                }
                if (tokens[0].nonce > 0 || tokens[1].nonce < 1) {
                    throw new Error('Invalid tokens nonce received!');
                }
                return tokens;
            case tokens[1].tokenID:
                if (!secondTokenID.includes(tokens[0].tokenID)) {
                    throw new Error('Invalid tokens received!');
                }
                if (tokens[1].nonce > 0 || tokens[0].nonce < 1) {
                    throw new Error('Invalid tokens nonce received!');
                }
                return [tokens[1], tokens[0], ...tokens.slice(2)];
            default:
                break;
        }

        throw new Error('Invalid tokens received!');
    }
}
