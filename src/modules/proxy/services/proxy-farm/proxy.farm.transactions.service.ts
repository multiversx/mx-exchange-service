import { Injectable } from '@nestjs/common';
import { constantsConfig, mxConfig, gasConfig } from '../../../../config';
import {
    BigUIntValue,
    BytesValue,
    TypedValue,
    U64Value,
} from '@multiversx/sdk-core/out/smartcontracts/typesystem';
import { Address, Interaction, TokenTransfer } from '@multiversx/sdk-core';
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
        const contract = await this.mxProxy.getProxyDexSmartContract(
            proxyAddress,
        );
        const version = farmVersion(args.farmAddress);

        const endpointArgs = [
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];
        const interaction: Interaction =
            version === FarmVersion.V1_2
                ? args.lockRewards
                    ? contract.methodsExplicit.enterFarmAndLockRewardsProxy(
                          endpointArgs,
                      )
                    : contract.methodsExplicit.enterFarmProxy(endpointArgs)
                : contract.methodsExplicit.enterFarmProxy(endpointArgs);

        const gasLimit =
            args.tokens.length > 1
                ? gasConfig.proxy.farms[version].enterFarm.withTokenMerge
                : gasConfig.proxy.farms[version].enterFarm.default;
        const mappedPayments = args.tokens.map((token) =>
            TokenTransfer.metaEsdtFromBigInteger(
                token.tokenID,
                token.nonce,
                new BigNumber(token.amount),
            ),
        );
        return interaction
            .withMultiESDTNFTTransfer(mappedPayments)
            .withSender(Address.fromString(sender))
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async exitFarmProxy(
        sender: string,
        proxyAddress: string,
        args: ExitFarmProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getProxyDexSmartContract(
            proxyAddress,
        );

        const endpointArgs: TypedValue[] = [
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];

        const gasLimit = await this.getExitFarmProxyGasLimit(args);

        return contract.methodsExplicit
            .exitFarmProxy(endpointArgs)
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    args.wrappedFarmTokenID,
                    args.wrappedFarmTokenNonce,
                    new BigNumber(args.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async claimFarmRewardsProxy(
        sender: string,
        proxyAddress: string,
        args: ClaimFarmRewardsProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getProxyDexSmartContract(
            proxyAddress,
        );

        const endpointArgs = [
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];

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

        return contract.methodsExplicit
            .claimRewardsProxy(endpointArgs)
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    args.wrappedFarmTokenID,
                    args.wrappedFarmTokenNonce,
                    new BigNumber(args.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async compoundRewardsProxy(
        sender: string,
        proxyAddress: string,
        args: CompoundRewardsProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getProxyDexSmartContract(
            proxyAddress,
        );

        const endpointArgs = [
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];

        const version = farmVersion(args.farmAddress);

        return contract.methodsExplicit
            .compoundRewardsProxy(endpointArgs)
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    args.tokenID,
                    args.tokenNonce,
                    new BigNumber(args.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasConfig.proxy.farms[version].compoundRewards)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async migrateToNewFarmProxy(
        sender: string,
        proxyAddress: string,
        args: ExitFarmProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getProxyDexSmartContract(
            proxyAddress,
        );

        const endpointArgs = [
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];
        const version = farmVersion(args.farmAddress);

        return contract.methodsExplicit
            .migrateV1_2Position(endpointArgs)
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    args.wrappedFarmTokenID,
                    args.wrappedFarmTokenNonce,
                    new BigNumber(args.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasConfig.proxy.farms[version].migrateToNewFarm)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
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

        const contract = await this.mxProxy.getProxyDexSmartContract(
            proxyAddress,
        );

        const endpointArgs = [
            BytesValue.fromHex(new Address(farmAddress).hex()),
        ];
        const gasLimit = gasConfig.proxy.farms.defaultMergeWFMT * tokens.length;
        const mappedPayments = tokens.map((token) =>
            TokenTransfer.metaEsdtFromBigInteger(
                token.tokenID,
                token.nonce,
                new BigNumber(token.amount),
            ),
        );

        return contract.methodsExplicit
            .mergeWrappedFarmTokens(endpointArgs)
            .withMultiESDTNFTTransfer(mappedPayments)
            .withSender(Address.fromString(sender))
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
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
        const contract = await this.mxProxy.getProxyDexSmartContract(
            proxyAddress,
        );
        return contract.methodsExplicit
            .increaseProxyFarmTokenEnergy([
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
