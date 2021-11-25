import { Inject, Injectable } from '@nestjs/common';
import { constantsConfig, elrondConfig, gasConfig } from 'src/config';
import {
    BigUIntValue,
    BytesValue,
    TypedValue,
    U32Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { Address, GasLimit } from '@elrondnetwork/erdjs';
import { TransactionModel } from 'src/models/transaction.model';
import BigNumber from 'bignumber.js';
import { PairService } from 'src/modules/pair/services/pair.service';
import {
    AddLiquidityProxyArgs,
    RemoveLiquidityProxyArgs,
} from '../../models/proxy-pair.args';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { InputTokenModel } from 'src/models/inputToken.model';
import { ProxyGetterService } from '../proxy.getter.service';
import { ProxyPairGetterService } from './proxy-pair.getter.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { ContextTransactionsService } from 'src/services/context/context.transactions.service';

@Injectable()
export class TransactionsProxyPairService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly contextTransactions: ContextTransactionsService,
        private readonly proxyGetter: ProxyGetterService,
        private readonly proxyPairGetter: ProxyPairGetterService,
        private readonly pairService: PairService,
        private readonly pairGetterService: PairGetterService,
        private readonly wrapService: WrapService,
        private readonly wrapTransaction: TransactionsWrapService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async addLiquidityProxyBatch(
        sender: string,
        args: AddLiquidityProxyArgs,
    ): Promise<TransactionModel[]> {
        const transactions: TransactionModel[] = [];

        switch (elrondConfig.EGLDIdentifier) {
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

        transactions.push(await this.addLiquidityProxy(sender, args));

        return transactions;
    }

    async addLiquidityProxy(
        sender: string,
        args: AddLiquidityProxyArgs,
    ): Promise<TransactionModel> {
        let inputTokens: InputTokenModel[];
        try {
            inputTokens = await this.convertInputTokenstoESDTTokens(
                args.tokens,
            );
            inputTokens = await this.validateInputTokens(
                args.pairAddress,
                inputTokens,
            );

            await this.validateInputWrappedLpTokens(inputTokens.slice(2));
        } catch (error) {
            const logMessage = generateLogMessage(
                TransactionsProxyPairService.name,
                this.addLiquidityProxy.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
        const contract = await this.elrondProxy.getProxyDexSmartContract();
        const amount0 = new BigNumber(inputTokens[0].amount);
        const amount1 = new BigNumber(inputTokens[1].amount);

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

        const gasLimit: GasLimit = new GasLimit(
            inputTokens.length > 2
                ? gasConfig.addLiquidityProxyMerge
                : gasConfig.addLiquidityProxy,
        );
        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            inputTokens,
            'addLiquidityProxy',
            endpointArgs,
            gasLimit,
        );
    }

    async removeLiquidityProxy(
        sender: string,
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
            this.wrapService.getWrappedEgldTokenID(),
            this.pairGetterService.getFirstTokenID(args.pairAddress),
            this.pairGetterService.getSecondTokenID(args.pairAddress),
            this.pairService.getLiquidityPosition(
                args.pairAddress,
                args.liquidity,
            ),
            this.elrondProxy.getProxyDexSmartContract(),
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

        const transactionArgs = [
            BytesValue.fromUTF8(args.wrappedLpTokenID),
            new U32Value(args.wrappedLpTokenNonce),
            new BigUIntValue(new BigNumber(args.liquidity)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('removeLiquidityProxy'),
            BytesValue.fromHex(new Address(args.pairAddress).hex()),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        const transaction = this.contextTransactions.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.removeLiquidityProxy),
        );
        transaction.receiver = sender;
        transactions.push(transaction);

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
        tokens: InputTokenModel[],
    ): Promise<TransactionModel> {
        if (
            gasConfig.defaultMergeWLPT * tokens.length >
            constantsConfig.MAX_GAS_LIMIT
        ) {
            throw new Error('Number of merge tokens exeeds maximum gas limit!');
        }

        try {
            await this.validateInputWrappedLpTokens(tokens);
        } catch (error) {
            const logMessage = generateLogMessage(
                TransactionsProxyPairService.name,
                this.mergeWrappedLPTokens.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
        const contract = await this.elrondProxy.getProxyDexSmartContract();

        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            tokens,
            'mergeWrappedLpTokens',
            [],
            new GasLimit(gasConfig.defaultMergeWLPT * tokens.length),
        );
    }

    private async convertInputTokenstoESDTTokens(
        tokens: InputTokenModel[],
    ): Promise<InputTokenModel[]> {
        const wrappedTokenID = await this.wrapService.getWrappedEgldTokenID();

        switch (elrondConfig.EGLDIdentifier) {
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

    private async validateInputWrappedLpTokens(
        tokens: InputTokenModel[],
    ): Promise<void> {
        const wrappedLpTokenID = await this.proxyPairGetter.getwrappedLpTokenID();

        for (const wrappedLpToken of tokens.slice(2)) {
            if (
                wrappedLpToken.tokenID !== wrappedLpTokenID ||
                wrappedLpToken.nonce < 1
            ) {
                throw new Error('Invalid wrapped LP Token to merge!');
            }
        }
    }

    private async validateInputTokens(
        pairAddress: string,
        tokens: InputTokenModel[],
    ): Promise<InputTokenModel[]> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairGetterService.getFirstTokenID(pairAddress),
            this.proxyGetter.getLockedAssetTokenID(),
        ]);

        switch (firstTokenID) {
            case tokens[0].tokenID:
                if (tokens[1].tokenID !== secondTokenID) {
                    throw new Error('Invalid tokens received!');
                }
                if (tokens[0].nonce > 0 || tokens[1].nonce < 1) {
                    throw new Error('Invalid tokens nonce received!');
                }
                return tokens;
            case tokens[1].tokenID:
                if (tokens[0].tokenID !== secondTokenID) {
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
