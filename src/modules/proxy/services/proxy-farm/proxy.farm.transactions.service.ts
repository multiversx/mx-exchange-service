import { Injectable } from '@nestjs/common';
import { constantsConfig, gasConfig } from '../../../../config';
import {
    Address,
    BytesValue,
    Token,
    TokenTransfer,
    U64Value,
} from '@multiversx/sdk-core';
import { TransactionModel } from '../../../../models/transaction.model';
import BigNumber from 'bignumber.js';

import {
    ClaimFarmRewardsProxyArgs,
    CompoundRewardsProxyArgs,
    EnterFarmProxyArgs,
    ExitFarmProxyArgs,
} from '../../models/proxy-farm.args';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { InputTokenModel } from 'src/models/inputToken.model';
import { farmType, farmVersion } from 'src/utils/farm.utils';
import {
    FarmRewardType,
    FarmVersion,
} from 'src/modules/farm/models/farm.model';
import { PairService } from 'src/modules/pair/services/pair.service';
import { proxyVersion } from 'src/utils/proxy.utils';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { FarmAbiFactory } from 'src/modules/farm/farm.abi.factory';
import { ProxyFarmAbiService } from './proxy.farm.abi.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import {
    WrappedFarmTokenAttributes,
    WrappedFarmTokenAttributesV2,
} from '@multiversx/sdk-exchange';
import { FarmAbiServiceV2 } from 'src/modules/farm/v2/services/farm.v2.abi.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { TransactionOptions } from 'src/modules/common/transaction.options';

@Injectable()
export class ProxyFarmTransactionsService {
    constructor(
        private readonly mxProxy: MXProxyService,
        private readonly mxApi: MXApiService,
        private readonly farmAbi: FarmAbiFactory,
        private readonly farmAbiV2: FarmAbiServiceV2,
        private readonly pairService: PairService,
        private readonly pairAbi: PairAbiService,
        private readonly proxyFarmAbi: ProxyFarmAbiService,
        private readonly contextGetter: ContextGetterService,
    ) {}

    async enterFarmProxy(
        sender: string,
        proxyAddress: string,
        args: EnterFarmProxyArgs,
    ): Promise<TransactionModel> {
        const version = farmVersion(args.farmAddress);

        const functionName =
            version === FarmVersion.V1_2 && args.lockRewards
                ? 'enterFarmAndLockRewardsProxy'
                : 'enterFarmProxy';

        const gasLimit =
            args.tokens.length > 1
                ? gasConfig.proxy.farms[version].enterFarm.withTokenMerge
                : gasConfig.proxy.farms[version].enterFarm.default;

        return this.mxProxy.getProxyDexSmartContractTransaction(
            proxyAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasLimit,
                function: functionName,
                arguments: [
                    BytesValue.fromHex(
                        Address.newFromBech32(args.farmAddress).toHex(),
                    ),
                ],
                tokenTransfers: args.tokens.map(
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

    async exitFarmProxy(
        sender: string,
        proxyAddress: string,
        args: ExitFarmProxyArgs,
    ): Promise<TransactionModel> {
        const gasLimit = await this.getExitFarmProxyGasLimit(args);

        return this.mxProxy.getProxyDexSmartContractTransaction(
            proxyAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasLimit,
                function: 'exitFarmProxy',
                arguments: [
                    BytesValue.fromHex(
                        Address.newFromBech32(args.farmAddress).toHex(),
                    ),
                ],
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: args.wrappedFarmTokenID,
                            nonce: BigInt(args.wrappedFarmTokenNonce),
                        }),
                        amount: BigInt(args.amount),
                    }),
                ],
            }),
        );
    }

    async claimFarmRewardsProxy(
        sender: string,
        proxyAddress: string,
        args: ClaimFarmRewardsProxyArgs,
    ): Promise<TransactionModel> {
        const version = farmVersion(args.farmAddress);
        const type =
            version === FarmVersion.V1_2
                ? args.lockRewards
                    ? FarmRewardType.LOCKED_REWARDS
                    : FarmRewardType.UNLOCKED_REWARDS
                : farmType(args.farmAddress);
        const lockedAssetCreateGas =
            type === FarmRewardType.LOCKED_REWARDS
                ? gasConfig.lockedAssetCreate
                : 0;
        const gasLimit =
            gasConfig.proxy.farms[version][type].claimRewards +
            lockedAssetCreateGas;

        return this.mxProxy.getProxyDexSmartContractTransaction(
            proxyAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasLimit,
                function: 'claimRewardsProxy',
                arguments: [
                    BytesValue.fromHex(
                        Address.newFromBech32(args.farmAddress).toHex(),
                    ),
                ],
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: args.wrappedFarmTokenID,
                            nonce: BigInt(args.wrappedFarmTokenNonce),
                        }),
                        amount: BigInt(args.amount),
                    }),
                ],
            }),
        );
    }

    async compoundRewardsProxy(
        sender: string,
        proxyAddress: string,
        args: CompoundRewardsProxyArgs,
    ): Promise<TransactionModel> {
        const version = farmVersion(args.farmAddress);

        return this.mxProxy.getProxyDexSmartContractTransaction(
            proxyAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.proxy.farms[version].compoundRewards,
                function: 'compoundRewardsProxy',
                arguments: [
                    BytesValue.fromHex(
                        Address.newFromBech32(args.farmAddress).toHex(),
                    ),
                ],
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: args.tokenID,
                            nonce: BigInt(args.tokenNonce),
                        }),
                        amount: BigInt(args.amount),
                    }),
                ],
            }),
        );
    }

    async migrateToNewFarmProxy(
        sender: string,
        proxyAddress: string,
        args: ExitFarmProxyArgs,
    ): Promise<TransactionModel> {
        const version = farmVersion(args.farmAddress);

        return this.mxProxy.getProxyDexSmartContractTransaction(
            proxyAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.proxy.farms[version].migrateToNewFarm,
                function: 'migrateV1_2Position',
                arguments: [
                    BytesValue.fromHex(
                        Address.newFromBech32(args.farmAddress).toHex(),
                    ),
                ],
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: args.wrappedFarmTokenID,
                            nonce: BigInt(args.wrappedFarmTokenNonce),
                        }),
                        amount: BigInt(args.amount),
                    }),
                ],
            }),
        );
    }

    async mergeWrappedFarmTokens(
        sender: string,
        proxyAddress: string,
        farmAddress: string,
        tokens: InputTokenModel[],
    ): Promise<TransactionModel> {
        if (
            gasConfig.defaultMergeWFMT * tokens.length >
            constantsConfig.MAX_GAS_LIMIT
        ) {
            throw new Error('Number of merge tokens exeeds maximum gas limit!');
        }

        const gasLimit = gasConfig.proxy.farms.defaultMergeWFMT * tokens.length;

        return this.mxProxy.getProxyDexSmartContractTransaction(
            proxyAddress,
            new TransactionOptions({
                sender: sender,
                gasLimit: gasLimit,
                function: 'mergeWrappedFarmTokens',
                arguments: [
                    BytesValue.fromHex(
                        Address.newFromBech32(farmAddress).toHex(),
                    ),
                ],
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

    async migrateTotalFarmPosition(
        sender: string,
        proxyAddress: string,
    ): Promise<TransactionModel[]> {
        const wrappedFarmTokenID = await this.proxyFarmAbi.wrappedFarmTokenID(
            proxyAddress,
        );
        const userNftsCount = await this.mxApi.getNftsCountForUser(sender);
        const userNfts = await this.contextGetter.getNftsForUser(
            sender,
            0,
            userNftsCount > 0 ? userNftsCount : 100,
            'MetaESDT',
            [wrappedFarmTokenID],
        );
        const promises: Promise<TransactionModel>[] = [];
        for (const nft of userNfts) {
            const version = proxyVersion(proxyAddress);

            let farmTokenID: string;
            let farmTokenNonce: number;
            if (version === 'v2') {
                const decodedAttributes =
                    WrappedFarmTokenAttributesV2.fromAttributes(nft.attributes);
                farmTokenID = decodedAttributes.farmToken.tokenIdentifier;
                farmTokenNonce = decodedAttributes.farmToken.tokenNonce;
            } else {
                const decodedAttributes =
                    WrappedFarmTokenAttributes.fromAttributes(nft.attributes);
                farmTokenID = decodedAttributes.farmTokenID;
                farmTokenNonce = decodedAttributes.farmTokenNonce;
            }

            const farmAddress = await this.farmAbi.getFarmAddressByFarmTokenID(
                farmTokenID,
            );

            const migrationNonce =
                await this.farmAbiV2.farmPositionMigrationNonce(farmAddress);

            if (farmTokenNonce < migrationNonce) {
                promises.push(
                    this.claimFarmRewardsProxy(sender, proxyAddress, {
                        farmAddress,
                        wrappedFarmTokenID: nft.collection,
                        wrappedFarmTokenNonce: nft.nonce,
                        amount: nft.balance,
                        lockRewards: true,
                    }),
                );
            }
        }

        return Promise.all(promises);
    }

    async increaseProxyFarmTokenEnergy(
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
                function: 'increaseProxyFarmTokenEnergy',
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

    private async getExitFarmProxyGasLimit(
        args: ExitFarmProxyArgs,
    ): Promise<number> {
        const version = farmVersion(args.farmAddress);
        const type =
            version === FarmVersion.V1_2
                ? args.lockRewards
                    ? FarmRewardType.LOCKED_REWARDS
                    : FarmRewardType.UNLOCKED_REWARDS
                : farmType(args.farmAddress);
        const lockedAssetCreateGas =
            type === FarmRewardType.LOCKED_REWARDS
                ? gasConfig.lockedAssetCreate
                : 0;
        const [farmedTokenID, farmingTokenID] = await Promise.all([
            this.farmAbi
                .useAbi(args.farmAddress)
                .farmedTokenID(args.farmAddress),
            this.farmAbi
                .useAbi(args.farmAddress)
                .farmingTokenID(args.farmAddress),
        ]);

        if (farmedTokenID === farmingTokenID) {
            const gasLimit = args.withPenalty
                ? gasConfig.proxy.farms[version][type].exitFarm.withPenalty
                      .localBurn
                : gasConfig.proxy.farms[version][type].exitFarm.default;
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
                    ? gasConfig.proxy.farms[version][type].exitFarm.withPenalty
                          .buybackAndBurn
                    : gasConfig.proxy.farms[version][type].exitFarm.withPenalty
                          .pairBurn
                : gasConfig.proxy.farms[version][type].exitFarm.default;
            return gasLimit + lockedAssetCreateGas;
        }

        const gasLimit = args.withPenalty
            ? gasConfig.proxy.farms[version][type].exitFarm.withPenalty
                  .localBurn
            : gasConfig.proxy.farms[version][type].exitFarm.default;
        return gasLimit + lockedAssetCreateGas;
    }
}
