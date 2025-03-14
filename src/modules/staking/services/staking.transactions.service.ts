import {
    Address,
    AddressValue,
    BigUIntValue,
    BytesValue,
    Token,
    TokenTransfer,
    U64Value,
} from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { gasConfig, constantsConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { StakingAbiService } from './staking.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { TransactionOptions } from 'src/modules/common/transaction.options';

@Injectable()
export class StakingTransactionService {
    constructor(
        private readonly stakingAbi: StakingAbiService,
        private readonly mxProxy: MXProxyService,
        private readonly mxApi: MXApiService,
        private readonly contextGetter: ContextGetterService,
    ) {}

    @ErrorLoggerAsync()
    async stakeFarm(
        sender: string,
        stakeAddress: string,
        payments: InputTokenModel[],
    ): Promise<TransactionModel> {
        await this.validateInputTokens(stakeAddress, payments);

        const gasLimit =
            payments.length > 1
                ? gasConfig.stake.stakeFarm.withTokenMerge
                : gasConfig.stake.stakeFarm.default;

        return this.mxProxy.getStakingSmartContractTransaction(
            stakeAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasLimit,
                function: 'stakeFarm',
                tokenTransfers: payments.map(
                    (payment) =>
                        new TokenTransfer({
                            token: new Token({
                                identifier: payment.tokenID,
                                nonce: BigInt(payment.nonce),
                            }),
                            amount: BigInt(payment.amount),
                        }),
                ),
            }),
        );
    }

    async unstakeFarm(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        return this.mxProxy.getStakingSmartContractTransaction(
            stakeAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.stake.unstakeFarm,
                function: 'unstakeFarm',
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

    async unbondFarm(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        return this.mxProxy.getStakingSmartContractTransaction(
            stakeAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.stake.unbondFarm,
                function: 'unbondFarm',
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

    async claimRewards(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        return this.mxProxy.getStakingSmartContractTransaction(
            stakeAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.stake.claimRewards,
                function: 'claimRewards',
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

    async claimRewardsWithNewValue(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
        newValue: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getStakingSmartContractTransaction(
            stakeAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.stake.claimRewardsWithNewValue,
                function: 'claimRewardsWithNewValue',
                arguments: [new BigUIntValue(new BigNumber(newValue))],
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

    async compoundRewards(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        return this.mxProxy.getStakingSmartContractTransaction(
            stakeAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.stake.compoundRewards,
                function: 'compoundRewards',
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

    async claimBoostedRewards(
        sender: string,
        stakeAddress: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getStakingSmartContractTransaction(
            stakeAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.stake.claimBoostedRewards,
                function: 'claimBoostedRewards',
            }),
        );
    }

    async migrateTotalStakingPosition(
        stakingAddress: string,
        userAddress: string,
    ): Promise<TransactionModel[]> {
        const [stakeTokenID, migrationNonce, userNftsCount] = await Promise.all(
            [
                this.stakingAbi.farmTokenID(stakingAddress),
                this.stakingAbi.farmPositionMigrationNonce(stakingAddress),
                this.mxApi.getNftsCountForUser(userAddress),
            ],
        );

        const userNfts = await this.contextGetter.getNftsForUser(
            userAddress,
            0,
            userNftsCount > 0 ? userNftsCount : 100,
            'MetaESDT',
            [stakeTokenID],
        );

        if (userNfts.length === 0) {
            return [];
        }

        const promises: Promise<TransactionModel>[] = [];
        userNfts.forEach((nft) => {
            if (
                nft.nonce < migrationNonce &&
                nft.attributes.length >
                    constantsConfig.STAKING_UNBOND_ATTRIBUTES_LEN
            ) {
                promises.push(
                    this.claimRewards(userAddress, stakingAddress, {
                        tokenID: nft.collection,
                        nonce: nft.nonce,
                        amount: nft.balance,
                    }),
                );
            }
        });

        return Promise.all(promises);
    }

    async topUpRewards(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        return this.mxProxy.getStakingSmartContractTransaction(
            stakeAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.stake.admin.topUpRewards,
                function: 'topUpRewards',
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: payment.tokenID,
                        }),
                        amount: BigInt(payment.amount),
                    }),
                ],
            }),
        );
    }

    async mergeFarmTokens(
        sender: string,
        stakeAddress: string,
        payments: InputTokenModel[],
    ): Promise<TransactionModel> {
        return this.mxProxy.getStakingSmartContractTransaction(
            stakeAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.stake.mergeTokens,
                function: 'mergeFarmTokens',
                tokenTransfers: payments.map(
                    (payment) =>
                        new TokenTransfer({
                            token: new Token({
                                identifier: payment.tokenID,
                                nonce: BigInt(payment.nonce),
                            }),
                            amount: BigInt(payment.amount),
                        }),
                ),
            }),
        );
    }

    async setAddressWhitelist(
        sender: string,
        stakeAddress: string,
        address: string,
        whitelist: boolean,
    ): Promise<TransactionModel> {
        return this.mxProxy.getStakingSmartContractTransaction(
            stakeAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.stake.admin.whitelist,
                function: whitelist
                    ? 'addSCAddressToWhitelist'
                    : 'removeSCAddressFromWhitelist',
                arguments: [new AddressValue(Address.newFromBech32(address))],
            }),
        );
    }

    async setState(
        sender: string,
        stakeAddress: string,
        state: boolean,
    ): Promise<TransactionModel> {
        return this.mxProxy.getStakingSmartContractTransaction(
            stakeAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.stake.admin.setState,
                function: state ? 'resume' : 'pause',
            }),
        );
    }

    async setLocalRolesFarmToken(
        sender: string,
        stakeAddress: string,
        address: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getStakingSmartContractTransaction(
            stakeAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.stake.admin.setLocalRolesFarmToken,
                function: 'setBurnRoleForAddress',
                arguments: [new AddressValue(Address.newFromBech32(address))],
            }),
        );
    }

    async registerFarmToken(
        sender: string,
        stakeAddress: string,
        tokenName: string,
        tokenTicker: string,
        decimals: number,
    ): Promise<TransactionModel> {
        return this.mxProxy.getStakingSmartContractTransaction(
            stakeAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.stake.admin.registerFarmToken,
                function: 'registerFarmToken',
                arguments: [
                    BytesValue.fromUTF8(tokenName),
                    BytesValue.fromUTF8(tokenTicker),
                    new U64Value(new BigNumber(decimals)),
                ],
            }),
        );
    }

    async setPerBlockRewardAmount(
        sender: string,
        stakeAddress: string,
        perBlockAmount: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getStakingSmartContractTransaction(
            stakeAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.stake.admin.setPerBlockRewardAmount,
                function: 'setPerBlockRewardAmount',
                arguments: [new BigUIntValue(new BigNumber(perBlockAmount))],
            }),
        );
    }

    async setMaxApr(
        sender: string,
        stakeAddress: string,
        maxApr: number,
    ): Promise<TransactionModel> {
        return this.mxProxy.getStakingSmartContractTransaction(
            stakeAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.stake.admin.setMaxApr,
                function: 'setMaxApr',
                arguments: [new BigUIntValue(new BigNumber(maxApr))],
            }),
        );
    }

    async setMinUnbondEpochs(
        sender: string,
        stakeAddress: string,
        minUnboundEpoch: number,
    ): Promise<TransactionModel> {
        return this.mxProxy.getStakingSmartContractTransaction(
            stakeAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.stake.admin.setMinUnbondEpochs,
                function: 'setMinUnbondEpochs',
                arguments: [new U64Value(new BigNumber(minUnboundEpoch))],
            }),
        );
    }

    async setRewardsState(
        sender: string,
        stakeAddress: string,
        rewards: boolean,
    ): Promise<TransactionModel> {
        return this.mxProxy.getStakingSmartContractTransaction(
            stakeAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.stake.admin.setRewardsState,
                function: rewards ? 'startProduceRewards' : 'endProduceRewards',
            }),
        );
    }

    private async validateInputTokens(
        stakeAddress: string,
        tokens: InputTokenModel[],
    ): Promise<void> {
        const [farmTokenID, farmingTokenID] = await Promise.all([
            this.stakingAbi.farmTokenID(stakeAddress),
            this.stakingAbi.farmingTokenID(stakeAddress),
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
}
