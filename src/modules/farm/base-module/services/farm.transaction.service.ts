import { TransactionModel } from '../../../../models/transaction.model';
import { BytesValue } from '@multiversx/sdk-core/out/smartcontracts/typesystem/bytes';
import {
    Address,
    BigUIntValue,
    TokenTransfer,
    TypedValue,
} from '@multiversx/sdk-core';
import { mxConfig, gasConfig } from '../../../../config';
import { BigNumber } from 'bignumber.js';
import {
    ClaimRewardsArgs,
    CompoundRewardsArgs,
    EnterFarmArgs,
    ExitFarmArgs,
} from '../../models/farm.args';
import { MXProxyService } from '../../../../services/multiversx-communication/mx.proxy.service';
import { InputTokenModel } from 'src/models/inputToken.model';
import { FarmRewardType, FarmVersion } from '../../models/farm.model';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { FarmAbiService } from './farm.abi.service';

export abstract class TransactionsFarmService {
    constructor(
        protected readonly mxProxy: MXProxyService,
        protected readonly farmAbi: FarmAbiService,
        protected readonly pairService: PairService,
        protected readonly pairAbi: PairAbiService,
    ) {}

    abstract enterFarm(
        sender: string,
        args: EnterFarmArgs,
    ): Promise<TransactionModel>;

    abstract exitFarm(
        sender: string,
        args: ExitFarmArgs,
    ): Promise<TransactionModel>;

    abstract claimRewards(
        sender: string,
        args: ClaimRewardsArgs,
    ): Promise<TransactionModel>;

    abstract compoundRewards(
        sender: string,
        args: CompoundRewardsArgs,
    ): Promise<TransactionModel>;

    protected async validateInputTokens(
        farmAddress: string,
        tokens: InputTokenModel[],
    ): Promise<void> {
        const [farmTokenID, farmingTokenID] = await Promise.all([
            this.farmAbi.farmTokenID(farmAddress),
            this.farmAbi.farmingTokenID(farmAddress),
        ]);

        if (tokens[0].tokenID !== farmingTokenID || tokens[0].nonce > 0) {
            throw new Error('invalid farming token provided');
        }

        for (const inputToken of tokens.slice(1)) {
            if (inputToken.tokenID !== farmTokenID || inputToken.nonce === 0) {
                throw new Error('invalid farm token provided');
            }
        }
    }

    protected async getExitFarmGasLimit(
        args: ExitFarmArgs,
        version: FarmVersion,
        type: FarmRewardType,
    ): Promise<number> {
        const lockedAssetCreateGas =
            type === FarmRewardType.LOCKED_REWARDS
                ? gasConfig.lockedAssetCreate
                : 0;
        const [farmedTokenID, farmingTokenID] = await Promise.all([
            this.farmAbi.farmedTokenID(args.farmAddress),
            this.farmAbi.farmingTokenID(args.farmAddress),
        ]);

        if (farmedTokenID === farmingTokenID) {
            const gasLimit = args.withPenalty
                ? gasConfig.farms[version][type].exitFarm.withPenalty.localBurn
                : gasConfig.farms[version][type].exitFarm.default;
            return gasLimit + lockedAssetCreateGas;
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingTokenID,
        );

        if (pairAddress) {
            const trustedSwapPairs = await this.pairAbi.trustedSwapPairs(
                pairAddress,
            );
            const gasLimit = args.withPenalty
                ? trustedSwapPairs.length > 0
                    ? gasConfig.farms[version][type].exitFarm.withPenalty
                          .buybackAndBurn
                    : gasConfig.farms[version][type].exitFarm.withPenalty
                          .pairBurn
                : gasConfig.farms[version][type].exitFarm.default;
            return gasLimit + lockedAssetCreateGas;
        }

        const gasLimit = args.withPenalty
            ? gasConfig.farms[version][type].exitFarm.withPenalty.localBurn
            : gasConfig.farms[version][type].exitFarm.default;
        return gasLimit + lockedAssetCreateGas;
    }

    async endProduceRewards(farmAddress: string): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        return contract.methodsExplicit
            .end_produce_rewards()
            .withGasLimit(gasConfig.farms.admin.end_produce_rewards)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async startProduceRewards(farmAddress: string): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        return contract.methodsExplicit
            .start_produce_rewards()
            .withGasLimit(gasConfig.farms.admin.start_produce_rewards)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setPerBlockRewardAmount(
        farmAddress: string,
        amount: string,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        return contract.methodsExplicit
            .setPerBlockRewardAmount([new BigUIntValue(new BigNumber(amount))])
            .withGasLimit(gasConfig.farms.admin.setPerBlockRewardAmount)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setPenaltyPercent(
        farmAddress: string,
        percent: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        return contract.methodsExplicit
            .set_penalty_percent([new BigUIntValue(new BigNumber(percent))])
            .withGasLimit(gasConfig.farms.admin.set_penalty_percent)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setMinimumFarmingEpochs(
        farmAddress: string,
        epochs: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        return contract.methodsExplicit
            .set_minimum_farming_epochs([
                new BigUIntValue(new BigNumber(epochs)),
            ])
            .withGasLimit(gasConfig.farms.admin.set_minimum_farming_epochs)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setTransferExecGasLimit(
        farmAddress: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        return contract.methodsExplicit
            .set_transfer_exec_gas_limit([
                new BigUIntValue(new BigNumber(gasLimit)),
            ])
            .withGasLimit(gasConfig.farms.admin.set_transfer_exec_gas_limit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setBurnGasLimit(
        farmAddress: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        return contract.methodsExplicit
            .set_burn_gas_limit([new BigUIntValue(new BigNumber(gasLimit))])
            .withGasLimit(gasConfig.farms.admin.set_burn_gas_limit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async pause(farmAddress: string): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        return contract.methodsExplicit
            .pause()
            .withGasLimit(gasConfig.farms.admin.pause)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async resume(farmAddress: string): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        return contract.methodsExplicit
            .resume()
            .withGasLimit(gasConfig.farms.admin.resume)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async registerFarmToken(
        farmAddress: string,
        tokenName: string,
        tokenTicker: string,
        decimals: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const transactionArgs: TypedValue[] = [
            BytesValue.fromUTF8(tokenName),
            BytesValue.fromUTF8(tokenTicker),
            new BigUIntValue(new BigNumber(decimals)),
        ];
        return contract.methodsExplicit
            .registerFarmToken(transactionArgs)
            .withGasLimit(gasConfig.farms.admin.registerFarmToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setLocalRolesFarmToken(
        farmAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        return contract.methodsExplicit
            .setLocalRolesFarmToken()
            .withGasLimit(gasConfig.farms.admin.setLocalRolesFarmToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async mergeFarmTokens(
        sender: string,
        farmAddress: string,
        payments: InputTokenModel[],
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        const mappedPayments = payments.map((tokenPayment) =>
            TokenTransfer.metaEsdtFromBigInteger(
                tokenPayment.tokenID,
                tokenPayment.nonce,
                new BigNumber(tokenPayment.amount),
            ),
        );
        return contract.methodsExplicit
            .mergeFarmTokens()
            .withMultiESDTNFTTransfer(mappedPayments)
            .withSender(Address.fromString(sender))
            .withGasLimit(
                gasConfig.farms.admin.mergeFarmTokensMultiplier *
                    payments.length,
            )
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}
