import { Inject, Injectable } from '@nestjs/common';
import { constantsConfig, elrondConfig, gasConfig } from '../../../../config';
import {
    BigUIntValue,
    BytesValue,
    TypedValue,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { Address, Interaction, TokenPayment } from '@elrondnetwork/erdjs';
import { TransactionModel } from '../../../../models/transaction.model';
import BigNumber from 'bignumber.js';

import {
    ClaimFarmRewardsProxyArgs,
    CompoundRewardsProxyArgs,
    EnterFarmProxyArgs,
    ExitFarmProxyArgs,
} from '../../models/proxy-farm.args';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { InputTokenModel } from 'src/models/inputToken.model';
import { farmType, farmVersion } from 'src/utils/farm.utils';
import {
    FarmRewardType,
    FarmVersion,
} from 'src/modules/farm/models/farm.model';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { FarmGetterFactory } from 'src/modules/farm/farm.getter.factory';
import { proxyVersion } from 'src/utils/proxy.utils';

@Injectable()
export class TransactionsProxyFarmService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly farmGetter: FarmGetterFactory,
        private readonly pairService: PairService,
        private readonly pairGetterService: PairGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async enterFarmProxy(
        sender: string,
        proxyAddress: string,
        args: EnterFarmProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getProxyDexSmartContract(
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
            TokenPayment.metaEsdtFromBigInteger(
                token.tokenID,
                token.nonce,
                new BigNumber(token.amount),
            ),
        );
        return interaction
            .withMultiESDTNFTTransfer(
                mappedPayments,
                Address.fromString(sender),
            )
            .withGasLimit(gasLimit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async exitFarmProxy(
        sender: string,
        proxyAddress: string,
        args: ExitFarmProxyArgs,
    ): Promise<TransactionModel> {
        const version = proxyVersion(proxyAddress);
        if (
            version === 'v2' &&
            !args.exitAmount &&
            !new BigNumber(args.exitAmount).isPositive()
        ) {
            throw new Error('Invalid exit amount');
        }
        const contract = await this.elrondProxy.getProxyDexSmartContract(
            proxyAddress,
        );

        const endpointArgs: TypedValue[] = [
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];
        if (version === 'v2') {
            endpointArgs.push(new BigUIntValue(new BigNumber(args.exitAmount)));
        }

        const gasLimit = await this.getExitFarmProxyGasLimit(args);

        return contract.methodsExplicit
            .exitFarmProxy(endpointArgs)
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    args.wrappedFarmTokenID,
                    args.wrappedFarmTokenNonce,
                    new BigNumber(args.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasLimit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async claimFarmRewardsProxy(
        sender: string,
        proxyAddress: string,
        args: ClaimFarmRewardsProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getProxyDexSmartContract(
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
                TokenPayment.metaEsdtFromBigInteger(
                    args.wrappedFarmTokenID,
                    args.wrappedFarmTokenNonce,
                    new BigNumber(args.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasLimit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async compoundRewardsProxy(
        sender: string,
        proxyAddress: string,
        args: CompoundRewardsProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getProxyDexSmartContract(
            proxyAddress,
        );

        const endpointArgs = [
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];

        const version = farmVersion(args.farmAddress);

        return contract.methodsExplicit
            .compoundRewardsProxy(endpointArgs)
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    args.tokenID,
                    args.tokenNonce,
                    new BigNumber(args.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasConfig.proxy.farms[version].compoundRewards)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async migrateToNewFarmProxy(
        sender: string,
        proxyAddress: string,
        args: ExitFarmProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getProxyDexSmartContract(
            proxyAddress,
        );

        const endpointArgs = [
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];
        const version = farmVersion(args.farmAddress);

        return contract.methodsExplicit
            .migrateV1_2Position(endpointArgs)
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    args.wrappedFarmTokenID,
                    args.wrappedFarmTokenNonce,
                    new BigNumber(args.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasConfig.proxy.farms[version].migrateToNewFarm)
            .withChainID(elrondConfig.chainID)
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

        const contract = await this.elrondProxy.getProxyDexSmartContract(
            proxyAddress,
        );

        const endpointArgs = [
            BytesValue.fromHex(new Address(farmAddress).hex()),
        ];
        const gasLimit = gasConfig.proxy.farms.defaultMergeWFMT * tokens.length;
        const mappedPayments = tokens.map((token) =>
            TokenPayment.metaEsdtFromBigInteger(
                token.tokenID,
                token.nonce,
                new BigNumber(token.amount),
            ),
        );

        return contract.methodsExplicit
            .mergeWrappedFarmTokens(endpointArgs)
            .withMultiESDTNFTTransfer(
                mappedPayments,
                Address.fromString(sender),
            )
            .withGasLimit(gasLimit)
            .withChainID(elrondConfig.chainID)
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
            this.farmGetter
                .useGetter(args.farmAddress)
                .getFarmedTokenID(args.farmAddress),
            this.farmGetter
                .useGetter(args.farmAddress)
                .getFarmingTokenID(args.farmAddress),
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
            const trustedSwapPairs =
                await this.pairGetterService.getTrustedSwapPairs(pairAddress);
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
