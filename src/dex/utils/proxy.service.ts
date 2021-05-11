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
        pairAddress: string,
        amount0: string,
        amount1: string,
        tolerance: number,
        token0ID: string,
        token1ID: string,
        token0Nonce?: number,
        token1Nonce?: number,
    ): Promise<TransactionModel> {
        const contract = await this.getContract();
        const token0 = await this.context.getTokenMetadata(token0ID);
        const token1 = await this.context.getTokenMetadata(token1ID);
        const amount0Denom = token0Nonce
            ? new BigNumber(amount0)
            : this.context.toBigNumber(amount0, token0);
        const amount1Denom = token1Nonce
            ? new BigNumber(amount1)
            : this.context.toBigNumber(amount1, token1);

        const amount0Min = amount0Denom.multipliedBy(1 - tolerance);
        const amount1Min = amount1Denom.multipliedBy(1 - tolerance);

        const interaction: Interaction = contract.methods.addLiquidityProxy([
            BytesValue.fromHex(new Address(pairAddress).hex()),
            BytesValue.fromUTF8(token0ID),
            new U32Value(token0Nonce ? token0Nonce : 0),
            new BigUIntValue(amount0Denom),
            new BigUIntValue(amount0Min),
            BytesValue.fromUTF8(token1ID),
            new U32Value(token1Nonce ? token1Nonce : 0),
            new BigUIntValue(amount1Denom),
            new BigUIntValue(amount1Min),
        ]);

        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.addLiquidity));

        return transaction.toPlainObject();
    }

    async removeLiquidityProxy(
        sender: string,
        pairAddress: string,
        wrappedLpTokenID: string,
        wrappedLpTokenNonce: number,
        liqidity: string,
        tolerance: number,
    ): Promise<TransactionModel> {
        const contract = await this.getContract();
        const liquidityPosition = await this.pairService.getLiquidityPosition(
            pairAddress,
            liqidity,
        );
        const amount0Min = new BigNumber(
            liquidityPosition.firstTokenAmount.toString(),
        ).multipliedBy(1 - tolerance);
        const amount1Min = new BigNumber(
            liquidityPosition.secondTokenAmount.toString(),
        ).multipliedBy(1 - tolerance);

        const args = [
            BytesValue.fromUTF8(wrappedLpTokenID),
            new U32Value(wrappedLpTokenNonce),
            new BigUIntValue(new BigNumber(liqidity)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('removeLiquidityProxy'),
            BytesValue.fromHex(new Address(pairAddress).hex()),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        const transaction = await this.context.nftTransfer(
            contract,
            args,
            new GasLimit(gasConfig.esdtTransfer),
        );

        transaction.receiver = sender;

        return transaction;
    }

    async esdtTransferProxy(
        amount: string,
        tokenID: string,
        tokenNonce?: number,
        sender?: string,
    ): Promise<TransactionModel> {
        const contract = await this.getContract();

        if (!tokenNonce) {
            const token = await this.context.getTokenMetadata(tokenID);
            const args = [
                BytesValue.fromUTF8(tokenID),
                new BigUIntValue(this.context.toBigNumber(amount, token)),
                BytesValue.fromUTF8('acceptEsdtPaymentProxy'),
            ];

            return this.context.esdtTransfer(
                contract,
                args,
                new GasLimit(gasConfig.esdtTransfer),
            );
        }

        const args = [
            BytesValue.fromUTF8(tokenID),
            new U32Value(tokenNonce),
            new BigUIntValue(new BigNumber(amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('acceptEsdtPaymentProxy'),
        ];

        const transaction = await this.context.nftTransfer(
            contract,
            args,
            new GasLimit(gasConfig.esdtTransfer),
        );

        transaction.receiver = sender;

        return transaction;
    }

    async reclaimTemporaryFundsProxy(
        firstTokenID: string,
        secondTokenID: string,
        firstTokenNonce?: number,
        secondTokenNonce?: number,
    ): Promise<TransactionModel> {
        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.reclaimTemporaryFundsProxy(
            [
                BytesValue.fromUTF8(firstTokenID),
                new U32Value(firstTokenNonce ? firstTokenNonce : 0),
                BytesValue.fromUTF8(secondTokenID),
                new U32Value(secondTokenNonce ? secondTokenNonce : 0),
            ],
        );

        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.reclaimTemporaryFunds));
        return transaction.toPlainObject();
    }

    async enterFarmProxy(
        sender: string,
        farmAddress: string,
        acceptedLockedTokenID: string,
        acceptedLockedTokenNonce: number,
        amount: string,
    ): Promise<TransactionModel> {
        const contract = await this.getContract();

        const args = [
            BytesValue.fromUTF8(acceptedLockedTokenID),
            new U32Value(acceptedLockedTokenNonce),
            new BigUIntValue(new BigNumber(amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('enterFarmProxy'),
            BytesValue.fromHex(new Address(farmAddress).hex()),
        ];

        const transaction = await this.context.nftTransfer(
            contract,
            args,
            new GasLimit(gasConfig.esdtTransfer),
        );

        transaction.receiver = sender;

        return transaction;
    }

    async exitFarmProxy(
        sender: string,
        farmAddress: string,
        wrappedFarmTokenID: string,
        wrappedFarmTokenNonce: number,
        amount: string,
    ): Promise<TransactionModel> {
        const contract = await this.getContract();

        const args = [
            BytesValue.fromUTF8(wrappedFarmTokenID),
            new U32Value(wrappedFarmTokenNonce),
            new BigUIntValue(new BigNumber(amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('exitFarmProxy'),
            BytesValue.fromHex(new Address(farmAddress).hex()),
        ];

        const transaction = await this.context.nftTransfer(
            contract,
            args,
            new GasLimit(gasConfig.esdtTransfer),
        );

        transaction.receiver = sender;

        return transaction;
    }

    async claimFarmRewardsProxy(
        sender: string,
        farmAddress: string,
        wrappedFarmTokenID: string,
        wrappedFarmTokenNonce: number,
        amount: string,
    ): Promise<TransactionModel> {
        const contract = await this.getContract();

        const args = [
            BytesValue.fromUTF8(wrappedFarmTokenID),
            new U32Value(wrappedFarmTokenNonce),
            new BigUIntValue(new BigNumber(amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('claimRewardsProxy'),
            BytesValue.fromHex(new Address(farmAddress).hex()),
        ];

        const transaction = await this.context.nftTransfer(
            contract,
            args,
            new GasLimit(gasConfig.esdtTransfer),
        );

        transaction.receiver = sender;

        return transaction;
    }
}
