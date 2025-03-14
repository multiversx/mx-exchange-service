import { Injectable } from '@nestjs/common';
import { constantsConfig, mxConfig, gasConfig } from 'src/config';
import {
    Address,
    BigUIntValue,
    BytesValue,
    Token,
    TokenTransfer,
    U64Value,
} from '@multiversx/sdk-core';
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
import { TransactionOptions } from 'src/modules/common/transaction.options';

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

        const amount0 = new BigNumber(liquidityTokens[0].amount);
        const amount1 = new BigNumber(liquidityTokens[1].amount);

        const amount0Min = amount0
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = amount1
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const gasLimit =
            liquidityTokens.length > 2
                ? gasConfig.proxy.pairs.addLiquidity.withTokenMerge
                : gasConfig.proxy.pairs.addLiquidity.default;

        return this.mxProxy.getProxyDexSmartContractTransaction(
            proxyAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasLimit,
                function: 'addLiquidityProxy',
                arguments: [
                    BytesValue.fromHex(
                        Address.newFromBech32(args.pairAddress).toHex(),
                    ),
                    new BigUIntValue(amount0Min),
                    new BigUIntValue(amount1Min),
                ],
                tokenTransfers: liquidityTokens.map(
                    (inputToken) =>
                        new TokenTransfer({
                            token: new Token({
                                identifier: inputToken.tokenID,
                                nonce: BigInt(inputToken.nonce),
                            }),
                            amount: BigInt(inputToken.amount),
                        }),
                ),
            }),
        );
    }

    async removeLiquidityProxy(
        sender: string,
        proxyAddress: string,
        args: RemoveLiquidityProxyArgs,
    ): Promise<TransactionModel[]> {
        const transactions = [];
        const [wrappedTokenID, firstTokenID, secondTokenID, liquidityPosition] =
            await Promise.all([
                this.wrapAbi.wrappedEgldTokenID(),
                this.pairAbi.firstTokenID(args.pairAddress),
                this.pairAbi.secondTokenID(args.pairAddress),
                this.pairService.getLiquidityPosition(
                    args.pairAddress,
                    args.liquidity,
                ),
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

        const removeLiquidityTransaction =
            await this.mxProxy.getProxyDexSmartContractTransaction(
                proxyAddress,
                new TransactionOptions({
                    sender: sender,
                    gasLimit: gasConfig.proxy.pairs.removeLiquidity,
                    function: 'removeLiquidityProxy',
                    arguments: [
                        BytesValue.fromHex(
                            Address.newFromBech32(args.pairAddress).toHex(),
                        ),
                        new BigUIntValue(amount0Min),
                        new BigUIntValue(amount1Min),
                    ],
                    tokenTransfers: [
                        new TokenTransfer({
                            token: new Token({
                                identifier: args.wrappedLpTokenID,
                                nonce: BigInt(args.wrappedLpTokenNonce),
                            }),
                            amount: BigInt(args.liquidity),
                        }),
                    ],
                }),
            );

        transactions.push(removeLiquidityTransaction);

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

        const gasLimit = gasConfig.proxy.pairs.defaultMergeWLPT * tokens.length;

        return this.mxProxy.getProxyDexSmartContractTransaction(
            proxyAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasLimit,
                function: 'mergeWrappedLpTokens',
                tokenTransfers: tokens.map(
                    (token) =>
                        new TokenTransfer({
                            token: new Token({
                                identifier: token.tokenID,
                                nonce: BigInt(token.nonce),
                            }),
                            amount: BigInt(token.amount),
                        }),
                ),
            }),
        );
    }

    async increaseProxyPairTokenEnergy(
        sender: string,
        proxyAddress: string,
        payment: InputTokenModel,
        lockEpochs: number,
    ): Promise<TransactionModel> {
        return this.mxProxy.getProxyDexSmartContractTransaction(
            proxyAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.proxy.pairs.increaseEnergy,
                function: 'increaseProxyPairTokenEnergy',
                arguments: [new U64Value(new BigNumber(lockEpochs))],
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: payment.tokenID,
                            nonce: BigInt(payment.nonce),
                        }),
                        amount: BigInt(payment.amount),
                    }),
                ],
            }),
        );
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
