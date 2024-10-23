import {
    Address,
    AddressValue,
    IGasLimit,
    Interaction,
    TokenTransfer,
    U16Value,
    U64Type,
    U64Value,
    VariadicType,
    VariadicValue,
} from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { mxConfig, gasConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { UnlockType } from '../models/energy.model';

@Injectable()
export class EnergyTransactionService {
    constructor(
        protected readonly contextGetter: ContextGetterService,
        protected readonly mxProxy: MXProxyService,
    ) {}

    async lockTokens(
        sender: string,
        inputTokens: InputTokenModel,
        lockEpochs: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getSimpleLockEnergySmartContract();

        const interaction =
            inputTokens.nonce > 0
                ? contract.methodsExplicit
                      .lockTokens([new U64Value(new BigNumber(lockEpochs))])
                      .withSingleESDTNFTTransfer(
                          TokenTransfer.metaEsdtFromBigInteger(
                              inputTokens.tokenID,
                              inputTokens.nonce,
                              new BigNumber(inputTokens.amount),
                          ),
                      )
                      .withSender(Address.fromString(sender))
                : contract.methodsExplicit
                      .lockTokens([new U64Value(new BigNumber(lockEpochs))])
                      .withSingleESDTTransfer(
                          TokenTransfer.fungibleFromBigInteger(
                              inputTokens.tokenID,
                              new BigNumber(inputTokens.amount),
                          ),
                      );
        return interaction
            .withGasLimit(gasConfig.simpleLockEnergy.lockTokens)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async unlockTokens(
        sender: string,
        inputTokens: InputTokenModel,
        unlockType: UnlockType,
        newLockPeriod?: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getSimpleLockEnergySmartContract();

        let endpoint: Interaction;
        let gasLimit: IGasLimit;
        switch (unlockType) {
            case UnlockType.EARLY_UNLOCK:
                endpoint = contract.methodsExplicit.unlockEarly();
                gasLimit = gasConfig.simpleLockEnergy.unlockTokens.unlockEarly;
                break;
            case UnlockType.REDUCE_PERIOD:
                endpoint = contract.methodsExplicit.reduceLockPeriod([
                    new U64Value(new BigNumber(newLockPeriod)),
                ]);
                gasLimit =
                    gasConfig.simpleLockEnergy.unlockTokens.reduceLockPeriod;
                break;
            default:
                endpoint = contract.methodsExplicit.unlockTokens();
                gasLimit = gasConfig.simpleLockEnergy.unlockTokens.default;
                break;
        }

        return endpoint
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    inputTokens.tokenID,
                    inputTokens.nonce,
                    new BigNumber(inputTokens.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async mergeTokens(
        sender: string,
        inputTokens: InputTokenModel[],
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getSimpleLockEnergySmartContract();

        const mappedTokenPayments = inputTokens.map((inputToken) =>
            TokenTransfer.metaEsdtFromBigInteger(
                inputToken.tokenID,
                inputToken.nonce,
                new BigNumber(inputToken.amount),
            ),
        );

        return contract.methodsExplicit
            .mergeTokens()
            .withMultiESDTNFTTransfer(mappedTokenPayments)
            .withSender(Address.fromString(sender))
            .withGasLimit(
                gasConfig.simpleLockEnergy.defaultMergeTokens *
                    inputTokens.length,
            )
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async migrateOldTokens(
        sender: string,
        args: InputTokenModel[],
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getSimpleLockEnergySmartContract();
        return contract.methodsExplicit
            .migrateOldTokens()
            .withMultiESDTNFTTransfer(
                args.map((token) =>
                    TokenTransfer.metaEsdtFromBigInteger(
                        token.tokenID,
                        token.nonce,
                        new BigNumber(token.amount),
                    ),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(
                gasConfig.simpleLockEnergy.migrateOldTokens * args.length,
            )
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    // Only owner transaction
    async updateLockOptions(
        lockOptions: number[],
        remove = false,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getSimpleLockEnergySmartContract();

        const endpointArgs = [
            new VariadicValue(
                new VariadicType(new U64Type(), false),
                lockOptions.map(
                    (lockOption) => new U64Value(new BigNumber(lockOption)),
                ),
            ),
        ];

        const endpoint = remove
            ? contract.methodsExplicit.removeLockOptions(endpointArgs)
            : contract.methodsExplicit.addLockOptions(endpointArgs);

        return endpoint
            .withGasLimit(gasConfig.simpleLockEnergy.admin.updateLockOptions)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    // Only owner transaction
    async setPenaltyPercentage(
        minPenaltyPercentage: number,
        maxPenaltyPercentage: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getSimpleLockEnergySmartContract();

        return contract.methodsExplicit
            .setPenaltyPercentage([
                new U16Value(new BigNumber(minPenaltyPercentage)),
                new U16Value(new BigNumber(maxPenaltyPercentage)),
            ])
            .withGasLimit(gasConfig.simpleLockEnergy.admin.setPenaltyPercentage)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    // Only owner transaction
    async setFeesBurnPercentage(percentage: number): Promise<TransactionModel> {
        const contract = await this.mxProxy.getSimpleLockEnergySmartContract();

        return contract.methodsExplicit
            .setFeesBurnPercentage([new U16Value(new BigNumber(percentage))])
            .withGasLimit(
                gasConfig.simpleLockEnergy.admin.setFeesBurnPercentage,
            )
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    // Only owner address
    async setFeesCollectorAddress(address: string): Promise<TransactionModel> {
        const contract = await this.mxProxy.getSimpleLockEnergySmartContract();

        return contract.methodsExplicit
            .setFeesBurnPercentage([
                new AddressValue(Address.fromString(address)),
            ])
            .withGasLimit(
                gasConfig.simpleLockEnergy.admin.setFeesCollectorAddress,
            )
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    // Only owner address
    async setOldLockedAssetFactoryAddress(
        address: string,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getSimpleLockEnergySmartContract();

        return contract.methodsExplicit
            .setOldLockedAssetFactoryAddress([
                new AddressValue(Address.fromString(address)),
            ])
            .withGasLimit(
                gasConfig.simpleLockEnergy.admin
                    .setOldLockedAssetFactoryAddress,
            )
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}
