import { TransactionModel } from '../../../../models/transaction.model';
import {
    BigUIntValue,
    BytesValue,
    Token,
    TokenTransfer,
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
import { TransactionOptions } from 'src/modules/common/transaction.options';

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

    async endProduceRewards(
        sender: string,
        farmAddress: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getFarmSmartContractTransaction(
            farmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.farms.admin.end_produce_rewards,
                function: 'end_produce_rewards',
            }),
        );
    }

    async startProduceRewards(
        sender: string,
        farmAddress: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getFarmSmartContractTransaction(
            farmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.farms.admin.start_produce_rewards,
                function: 'start_produce_rewards',
            }),
        );
    }

    async setPerBlockRewardAmount(
        sender: string,
        farmAddress: string,
        amount: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getFarmSmartContractTransaction(
            farmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.farms.admin.setPerBlockRewardAmount,
                function: 'setPerBlockRewardAmount',
                arguments: [new BigUIntValue(new BigNumber(amount))],
            }),
        );
    }

    async setPenaltyPercent(
        sender: string,
        farmAddress: string,
        percent: number,
    ): Promise<TransactionModel> {
        return this.mxProxy.getFarmSmartContractTransaction(
            farmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.farms.admin.set_penalty_percent,
                function: 'set_penalty_percent',
                arguments: [new BigUIntValue(new BigNumber(percent))],
            }),
        );
    }

    async setMinimumFarmingEpochs(
        sender: string,
        farmAddress: string,
        epochs: number,
    ): Promise<TransactionModel> {
        return this.mxProxy.getFarmSmartContractTransaction(
            farmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.farms.admin.set_minimum_farming_epochs,
                function: 'set_minimum_farming_epochs',
                arguments: [new BigUIntValue(new BigNumber(epochs))],
            }),
        );
    }

    async setTransferExecGasLimit(
        sender: string,
        farmAddress: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        return this.mxProxy.getFarmSmartContractTransaction(
            farmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.farms.admin.set_transfer_exec_gas_limit,
                function: 'set_transfer_exec_gas_limit',
                arguments: [new BigUIntValue(new BigNumber(gasLimit))],
            }),
        );
    }

    async setBurnGasLimit(
        sender: string,
        farmAddress: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        return this.mxProxy.getFarmSmartContractTransaction(
            farmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.farms.admin.set_burn_gas_limit,
                function: 'set_burn_gas_limit',
                arguments: [new BigUIntValue(new BigNumber(gasLimit))],
            }),
        );
    }

    async pause(
        sender: string,
        farmAddress: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getFarmSmartContractTransaction(
            farmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.farms.admin.pause,
                function: 'pause',
            }),
        );
    }

    async resume(
        sender: string,
        farmAddress: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getFarmSmartContractTransaction(
            farmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.farms.admin.resume,
                function: 'resume',
            }),
        );
    }

    async registerFarmToken(
        sender: string,
        farmAddress: string,
        tokenName: string,
        tokenTicker: string,
        decimals: number,
    ): Promise<TransactionModel> {
        return this.mxProxy.getFarmSmartContractTransaction(
            farmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.farms.admin.registerFarmToken,
                function: 'registerFarmToken',
                arguments: [
                    BytesValue.fromUTF8(tokenName),
                    BytesValue.fromUTF8(tokenTicker),
                    new BigUIntValue(new BigNumber(decimals)),
                ],
            }),
        );
    }

    async setLocalRolesFarmToken(
        sender: string,
        farmAddress: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getFarmSmartContractTransaction(
            farmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.farms.admin.setLocalRolesFarmToken,
                function: 'setLocalRolesFarmToken',
            }),
        );
    }

    async mergeFarmTokens(
        sender: string,
        farmAddress: string,
        payments: InputTokenModel[],
    ): Promise<TransactionModel> {
        return this.mxProxy.getFarmSmartContractTransaction(
            farmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit:
                    gasConfig.farms['v1.3'].mergeFarmTokensMultiplier *
                    payments.length,
                function: 'mergeFarmTokens',
                tokenTransfers: payments.map(
                    (tokenPayment) =>
                        new TokenTransfer({
                            token: new Token({
                                identifier: tokenPayment.tokenID,
                                nonce: BigInt(tokenPayment.nonce),
                            }),
                            amount: BigInt(tokenPayment.amount),
                        }),
                ),
            }),
        );
    }
}
