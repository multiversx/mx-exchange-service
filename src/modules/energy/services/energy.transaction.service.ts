import {
    Address,
    AddressValue,
    IGasLimit,
    Interaction,
    TokenPayment,
    U16Value,
    U64Type,
    U64Value,
    VariadicValue,
} from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { elrondConfig, gasConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { UnlockType } from '../models/energy.model';
import { UnlockAssetsArgs } from "../../locked-asset-factory/models/locked-asset.args";

@Injectable()
export class EnergyTransactionService {
    constructor(
        protected readonly contextGetter: ContextGetterService,
        protected readonly elrondProxy: ElrondProxyService,
    ) {}

    async lockTokens(
        sender: string,
        inputTokens: InputTokenModel,
        lockEpochs: number,
    ): Promise<TransactionModel> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();

        const interaction =
            inputTokens.nonce > 0
                ? contract.methodsExplicit
                      .lockTokens([new U64Value(new BigNumber(lockEpochs))])
                      .withSingleESDTNFTTransfer(
                          TokenPayment.metaEsdtFromBigInteger(
                              inputTokens.tokenID,
                              inputTokens.nonce,
                              new BigNumber(inputTokens.amount),
                          ),
                          Address.fromString(sender),
                      )
                : contract.methodsExplicit
                      .lockTokens([new U64Value(new BigNumber(lockEpochs))])
                      .withSingleESDTTransfer(
                          TokenPayment.fungibleFromBigInteger(
                              inputTokens.tokenID,
                              new BigNumber(inputTokens.amount),
                          ),
                      );
        return interaction
            .withGasLimit(gasConfig.simpleLockEnergy.lockTokens)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async unlockTokens(
        sender: string,
        inputTokens: InputTokenModel,
        unlockType: UnlockType,
        epochsToReduce?: number,
    ): Promise<TransactionModel> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();

        let endpoint: Interaction;
        let gasLimit: IGasLimit;
        switch (unlockType) {
            case UnlockType.EARLY_UNLOCK:
                endpoint = contract.methodsExplicit.unlockEarly();
                gasLimit = gasConfig.simpleLockEnergy.unlockTokens.unlockEarly;
                break;
            case UnlockType.REDUCE_PERIOD:
                endpoint = contract.methodsExplicit.reduceLockPeriod([
                    new U64Value(new BigNumber(epochsToReduce)),
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
                TokenPayment.metaEsdtFromBigInteger(
                    inputTokens.tokenID,
                    inputTokens.nonce,
                    new BigNumber(inputTokens.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasLimit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async mergeTokens(
        sender: string,
        inputTokens: InputTokenModel[],
    ): Promise<TransactionModel> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();

        const mappedTokenPayments = inputTokens.map((inputToken) =>
            TokenPayment.metaEsdtFromBigInteger(
                inputToken.tokenID,
                inputToken.nonce,
                new BigNumber(inputToken.amount),
            ),
        );

        return contract.methodsExplicit
            .mergeTokens()
            .withMultiESDTNFTTransfer(
                mappedTokenPayments,
                Address.fromString(sender),
            )
            .withGasLimit(
                gasConfig.simpleLockEnergy.defaultMergeTokens *
                    inputTokens.length,
            )
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async migrateOldTokens(
        sender: string,
        args: UnlockAssetsArgs
    ): Promise<TransactionModel> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();

        return contract.methodsExplicit
            .migrateOldTokens()
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    args.lockedTokenID,
                    args.lockedTokenNonce,
                    new BigNumber(args.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasConfig.simpleLockEnergy.migrateOldTokens)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    // Only owner transaction
    async updateLockOptions(
        lockOptions: number[],
        remove = false,
    ): Promise<TransactionModel> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();

        const endpointArgs = [
            new VariadicValue(
                new U64Type(),
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
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    // Only owner transaction
    async setPenaltyPercentage(
        minPenaltyPercentage: number,
        maxPenaltyPercentage: number,
    ): Promise<TransactionModel> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();

        return contract.methodsExplicit
            .setPenaltyPercentage([
                new U16Value(new BigNumber(minPenaltyPercentage)),
                new U16Value(new BigNumber(maxPenaltyPercentage)),
            ])
            .withGasLimit(gasConfig.simpleLockEnergy.admin.setPenaltyPercentage)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    // Only owner transaction
    async setFeesBurnPercentage(percentage: number): Promise<TransactionModel> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();

        return contract.methodsExplicit
            .setFeesBurnPercentage([new U16Value(new BigNumber(percentage))])
            .withGasLimit(
                gasConfig.simpleLockEnergy.admin.setFeesBurnPercentage,
            )
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    // Only owner address
    async setFeesCollectorAddress(address: string): Promise<TransactionModel> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();

        return contract.methodsExplicit
            .setFeesBurnPercentage([
                new AddressValue(Address.fromString(address)),
            ])
            .withGasLimit(
                gasConfig.simpleLockEnergy.admin.setFeesCollectorAddress,
            )
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    // Only owner address
    async setOldLockedAssetFactoryAddress(
        address: string,
    ): Promise<TransactionModel> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();

        return contract.methodsExplicit
            .setOldLockedAssetFactoryAddress([
                new AddressValue(Address.fromString(address)),
            ])
            .withGasLimit(
                gasConfig.simpleLockEnergy.admin
                    .setOldLockedAssetFactoryAddress,
            )
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}
