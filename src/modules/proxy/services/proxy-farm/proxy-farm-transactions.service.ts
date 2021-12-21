import { Inject, Injectable } from '@nestjs/common';
import { constantsConfig, gasConfig } from '../../../../config';
import {
    BigUIntValue,
    BytesValue,
    U32Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { Address, GasLimit } from '@elrondnetwork/erdjs';
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
import { ContextTransactionsService } from 'src/services/context/context.transactions.service';
import { farmType, farmVersion } from 'src/utils/farm.utils';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { FarmGetterService } from 'src/modules/farm/services/farm.getter.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';

@Injectable()
export class TransactionsProxyFarmService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly contextTransactions: ContextTransactionsService,
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
        const [version, type] = [
            farmVersion(args.farmAddress),
            farmType(args.farmAddress),
        ];

        let method: string;
        let gasLimit: number;
        switch (version) {
            case FarmVersion.V1_2:
                method = args.lockRewards
                    ? 'enterFarmAndLockRewardsProxy'
                    : 'enterFarmProxy';
                gasLimit =
                    args.tokens.length > 1
                        ? gasConfig.proxy.farms[version].enterFarm
                              .withTokenMerge
                        : gasConfig.proxy.farms[version].enterFarm.default;
                break;
            case FarmVersion.V1_3:
                method = 'enterFarmProxy';
                gasLimit =
                    args.tokens.length > 1
                        ? gasConfig.proxy.farms[version][type].enterFarm
                              .withTokenMerge
                        : gasConfig.proxy.farms[version][type].enterFarm
                              .default;
        }

        const endpointArgs = [
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];

        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            args.tokens,
            method,
            endpointArgs,
            new GasLimit(gasLimit),
        );
    }

    async exitFarmProxy(
        sender: string,
        args: ExitFarmProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();

        const transactionArgs = [
            BytesValue.fromUTF8(args.wrappedFarmTokenID),
            new U32Value(args.wrappedFarmTokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('exitFarmProxy'),
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];
        const gasLimit = await this.getExitFarmProxyGasLimit(args);
        const transaction = this.contextTransactions.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasLimit),
        );

        transaction.receiver = sender;

        return transaction;
    }

    async claimFarmRewardsProxy(
        sender: string,
        args: ClaimFarmRewardsProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();

        const transactionArgs = [
            BytesValue.fromUTF8(args.wrappedFarmTokenID),
            new U32Value(args.wrappedFarmTokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('claimRewardsProxy'),
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];

        const [version, type] = [
            farmVersion(args.farmAddress),
            farmType(args.farmAddress),
        ];
        let gasLimit: number;
        switch (version) {
            case FarmVersion.V1_2:
                gasLimit = gasConfig.proxy.farms[version].claimRewards;
                break;
            case FarmVersion.V1_3:
                gasLimit = gasConfig.proxy.farms[version][type].claimRewards;
        }

        const transaction = this.contextTransactions.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasLimit),
        );

        transaction.receiver = sender;

        return transaction;
    }

    async compoundRewardsProxy(
        sender: string,
        args: CompoundRewardsProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();

        const transactionArgs = [
            BytesValue.fromUTF8(args.tokenID),
            new U32Value(args.tokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('compoundRewardsProxy'),
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];

        const [version, type] = [
            farmVersion(args.farmAddress),
            farmType(args.farmAddress),
        ];
        let gasLimit: number;
        switch (version) {
            case FarmVersion.V1_2:
                gasLimit = gasConfig.proxy.farms[version].compoundRewards;
                break;
            case FarmVersion.V1_3:
                gasLimit = gasConfig.proxy.farms[version][type].compoundRewards;
        }

        const transaction = this.contextTransactions.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasLimit),
        );

        transaction.receiver = sender;

        return transaction;
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

        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            tokens,
            'mergeWrappedFarmTokens',
            endpointArgs,
            new GasLimit(
                gasConfig.proxy.farms.defaultMergeWFMT * tokens.length,
            ),
        );
    }

    private async validateWFMTInputTokens(
        tokens: InputTokenModel[],
    ): Promise<void> {
        const wrappedFarmTokenID = await this.proxyFarmGetter.getwrappedFarmTokenID();

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
        const type = farmType(args.farmAddress);
        const [farmedTokenID, farmingTokenID] = await Promise.all([
            this.farmGetterService.getFarmedTokenID(args.farmAddress),
            this.farmGetterService.getFarmingTokenID(args.farmAddress),
        ]);

        if (farmedTokenID === farmingTokenID) {
            switch (version) {
                case FarmVersion.V1_2:
                    return args.withPenalty
                        ? gasConfig.proxy.farms[version].exitFarm.withPenalty
                              .localBurn
                        : gasConfig.proxy.farms[version].exitFarm.default;
                case FarmVersion.V1_3:
                    return args.withPenalty
                        ? gasConfig.proxy.farms[version][type].exitFarm
                              .withPenalty.localBurn
                        : gasConfig.proxy.farms[version][type].exitFarm.default;
            }
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingTokenID,
        );

        if (pairAddress) {
            const trustedSwapPairs = await this.pairGetterService.getTrustedSwapPairs(
                pairAddress,
            );
            switch (version) {
                case FarmVersion.V1_2:
                    return args.withPenalty
                        ? trustedSwapPairs.length > 0
                            ? gasConfig.proxy.farms[version].exitFarm
                                  .withPenalty.buybackAndBurn
                            : gasConfig.proxy.farms[version].exitFarm
                                  .withPenalty.pairBurn
                        : gasConfig.proxy.farms[version].exitFarm.default;
                case FarmVersion.V1_3:
                    return args.withPenalty
                        ? trustedSwapPairs.length > 0
                            ? gasConfig.proxy.farms[version][type].exitFarm
                                  .withPenalty.buybackAndBurn
                            : gasConfig.proxy.farms[version][type].exitFarm
                                  .withPenalty.pairBurn
                        : gasConfig.proxy.farms[version][type].exitFarm.default;
            }
        }

        switch (version) {
            case FarmVersion.V1_2:
                return args.withPenalty
                    ? gasConfig.proxy.farms[version].exitFarm.withPenalty
                          .localBurn
                    : gasConfig.proxy.farms[version].exitFarm.default;
            case FarmVersion.V1_3:
                return args.withPenalty
                    ? gasConfig.proxy.farms[version][type].exitFarm.withPenalty
                          .localBurn
                    : gasConfig.proxy.farms[version][type].exitFarm.default;
        }
    }
}
