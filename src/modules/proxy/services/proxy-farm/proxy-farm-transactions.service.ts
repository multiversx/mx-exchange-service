import { Inject, Injectable } from '@nestjs/common';
import { constantsConfig, elrondConfig, gasConfig } from '../../../../config';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
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
import { ProxyFarmGetterService } from './proxy-farm.getter.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { InputTokenModel } from 'src/models/inputToken.model';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { ProxyPairGetterService } from '../proxy-pair/proxy-pair.getter.service';
import { ProxyGetterService } from '../proxy.getter.service';
import { farmType, farmVersion } from 'src/utils/farm.utils';
import {
    FarmRewardType,
    FarmVersion,
} from 'src/modules/farm/models/farm.model';
import { FarmGetterService } from 'src/modules/farm/base-module/services/farm.getter.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';

@Injectable()
export class TransactionsProxyFarmService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly proxyFarmGetter: ProxyFarmGetterService,
        private readonly proxyPairService: ProxyPairGetterService,
        private readonly proxyGetter: ProxyGetterService,
        private readonly farmGetterService: FarmGetterService,
        private readonly pairService: PairService,
        private readonly pairGetterService: PairGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async enterFarmProxy(
        sender: string,
        args: EnterFarmProxyArgs,
    ): Promise<TransactionModel> {
        try {
            await this.validateInputTokens(args.tokens);
            await this.validateWFMTInputTokens(args.tokens.slice(1));
        } catch (error) {
            const logMessage = generateLogMessage(
                TransactionsProxyFarmService.name,
                this.enterFarmProxy.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }

        const contract = await this.elrondProxy.getProxyDexSmartContract();
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
        args: ExitFarmProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();

        const endpointArgs = [
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];
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
        args: ClaimFarmRewardsProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();

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
        args: CompoundRewardsProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();

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
        args: ExitFarmProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();

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
        farmAddress: string,
        tokens: InputTokenModel[],
    ): Promise<TransactionModel> {
        if (
            gasConfig.defaultMergeWFMT * tokens.length >
            constantsConfig.MAX_GAS_LIMIT
        ) {
            throw new Error('Number of merge tokens exeeds maximum gas limit!');
        }

        try {
            await this.validateWFMTInputTokens(tokens);
        } catch (error) {
            const logMessage = generateLogMessage(
                TransactionsProxyFarmService.name,
                this.mergeWrappedFarmTokens.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }

        const contract = await this.elrondProxy.getProxyDexSmartContract();

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

    private async validateWFMTInputTokens(
        tokens: InputTokenModel[],
    ): Promise<void> {
        const wrappedFarmTokenID =
            await this.proxyFarmGetter.getwrappedFarmTokenID();

        for (const wrappedFarmToken of tokens) {
            if (
                wrappedFarmToken.tokenID !== wrappedFarmTokenID ||
                wrappedFarmToken.nonce < 1
            ) {
                throw new Error('Invalid tokens for merge!');
            }
        }
    }

    private async validateInputTokens(
        tokens: InputTokenModel[],
    ): Promise<void> {
        const [lockedAssetTokenID, wrappedLPTokenID] = await Promise.all([
            this.proxyGetter.getLockedAssetTokenID(),
            this.proxyPairService.getwrappedLpTokenID(),
        ]);

        if (
            (tokens[0].tokenID !== lockedAssetTokenID &&
                tokens[0].tokenID !== wrappedLPTokenID) ||
            tokens[0].nonce < 1
        ) {
            throw new Error('Invalid farming token received!');
        }
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
            this.farmGetterService.getFarmedTokenID(args.farmAddress),
            this.farmGetterService.getFarmingTokenID(args.farmAddress),
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
