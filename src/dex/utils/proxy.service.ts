import { Injectable } from '@nestjs/common';
import { CacheManagerService } from '../../services/cache-manager/cache-manager.service';
import { elrondConfig, abiConfig, gasConfig } from '../../config';
import {
    AbiRegistry,
    BigUIntValue,
    BytesValue,
    U32Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { Address, SmartContract, GasLimit } from '@elrondnetwork/erdjs';
import { TransactionModel } from '../models/transaction.model';
import BigNumber from 'bignumber.js';
import { ContextService } from './context.service';
import { PairService } from '../pair/pair.service';
import {
    AddLiquidityProxyArgs,
    ReclaimTemporaryFundsProxyArgs,
    RemoveLiquidityProxyArgs,
    TokensTransferArgs,
} from './dto/proxy-pair.args';
import {
    ClaimFarmRewardsProxyArgs,
    EnterFarmProxyArgs,
    ExitFarmProxyArgs,
} from './dto/proxy-farm.args';

@Injectable()
export class ProxyService {
    constructor(
        private cacheManagerService: CacheManagerService,
        private context: ContextService,
        private pairService: PairService,
    ) {}

    private async getContract(): Promise<SmartContract> {
        const abiRegistry = await AbiRegistry.load({
            files: [abiConfig.distribution],
        });
        const abi = new SmartContractAbi(abiRegistry, ['ProxyDexImpl']);
        const contract = new SmartContract({
            address: new Address(elrondConfig.distributionAddress),
            abi: abi,
        });

        return contract;
    }

    async addLiquidityProxy(
        args: AddLiquidityProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.getContract();
        const token0 = await this.context.getTokenMetadata(args.token0ID);
        const token1 = await this.context.getTokenMetadata(args.token1ID);
        const amount0Denom = args.token0Nonce
            ? new BigNumber(args.amount0)
            : this.context.toBigNumber(args.amount0, token0);
        const amount1Denom = args.token1Nonce
            ? new BigNumber(args.amount1)
            : this.context.toBigNumber(args.amount1, token1);

        const amount0Min = amount0Denom.multipliedBy(1 - args.tolerance);
        const amount1Min = amount1Denom.multipliedBy(1 - args.tolerance);

        const interaction: Interaction = contract.methods.addLiquidityProxy([
            BytesValue.fromHex(new Address(args.pairAddress).hex()),
            BytesValue.fromUTF8(args.token0ID),
            new U32Value(args.token0Nonce ? args.token0Nonce : 0),
            new BigUIntValue(amount0Denom),
            new BigUIntValue(amount0Min),
            BytesValue.fromUTF8(args.token1ID),
            new U32Value(args.token1Nonce ? args.token1Nonce : 0),
            new BigUIntValue(amount1Denom),
            new BigUIntValue(amount1Min),
        ]);

        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.addLiquidity));

        return transaction.toPlainObject();
    }

    async removeLiquidityProxy(
        args: RemoveLiquidityProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.getContract();
        const liquidityPosition = await this.pairService.getLiquidityPosition(
            args.pairAddress,
            args.liqidity,
        );
        const amount0Min = new BigNumber(
            liquidityPosition.firstTokenAmount.toString(),
        ).multipliedBy(1 - args.tolerance);
        const amount1Min = new BigNumber(
            liquidityPosition.secondTokenAmount.toString(),
        ).multipliedBy(1 - args.tolerance);

        const transactionArgs = [
            BytesValue.fromUTF8(args.wrappedLpTokenID),
            new U32Value(args.wrappedLpTokenNonce),
            new BigUIntValue(new BigNumber(args.liqidity)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('removeLiquidityProxy'),
            BytesValue.fromHex(new Address(args.pairAddress).hex()),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        const transaction = await this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.esdtTransfer),
        );

        transaction.receiver = args.sender;

        return transaction;
    }

    async esdtTransferProxy(
        args: TokensTransferArgs,
    ): Promise<TransactionModel> {
        const contract = await this.getContract();

        if (!args.tokenNonce) {
            const token = await this.context.getTokenMetadata(args.tokenID);
            const transactionArgs = [
                BytesValue.fromUTF8(args.tokenID),
                new BigUIntValue(this.context.toBigNumber(args.amount, token)),
                BytesValue.fromUTF8('acceptEsdtPaymentProxy'),
            ];

            return this.context.esdtTransfer(
                contract,
                transactionArgs,
                new GasLimit(gasConfig.esdtTransfer),
            );
        }

        const transactionArgs = [
            BytesValue.fromUTF8(args.tokenID),
            new U32Value(args.tokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('acceptEsdtPaymentProxy'),
        ];

        const transaction = await this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.esdtTransfer),
        );

        transaction.receiver = args.sender;

        return transaction;
    }

    async reclaimTemporaryFundsProxy(
        args: ReclaimTemporaryFundsProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.reclaimTemporaryFundsProxy(
            [
                BytesValue.fromUTF8(args.firstTokenID),
                new U32Value(args.firstTokenNonce ? args.firstTokenNonce : 0),
                BytesValue.fromUTF8(args.secondTokenID),
                new U32Value(args.secondTokenNonce ? args.secondTokenNonce : 0),
            ],
        );

        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.reclaimTemporaryFunds));
        return transaction.toPlainObject();
    }

    async enterFarmProxy(args: EnterFarmProxyArgs): Promise<TransactionModel> {
        const contract = await this.getContract();

        const transactionArgs = [
            BytesValue.fromUTF8(args.acceptedLockedTokenID),
            new U32Value(args.acceptedLockedTokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('enterFarmProxy'),
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];

        const transaction = await this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.esdtTransfer),
        );

        transaction.receiver = args.sender;

        return transaction;
    }

    async exitFarmProxy(args: ExitFarmProxyArgs): Promise<TransactionModel> {
        const contract = await this.getContract();

        const transactionArgs = [
            BytesValue.fromUTF8(args.wrappedFarmTokenID),
            new U32Value(args.wrappedFarmTokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('exitFarmProxy'),
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];

        const transaction = await this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.esdtTransfer),
        );

        transaction.receiver = args.sender;

        return transaction;
    }

    async claimFarmRewardsProxy(
        args: ClaimFarmRewardsProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.getContract();

        const transactionArgs = [
            BytesValue.fromUTF8(args.wrappedFarmTokenID),
            new U32Value(args.wrappedFarmTokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('claimRewardsProxy'),
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];

        const transaction = await this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.esdtTransfer),
        );

        transaction.receiver = args.sender;

        return transaction;
    }
}
