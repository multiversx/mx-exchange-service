import {
    Address,
    AddressValue,
    Interaction,
    StringValue,
    TokenPayment,
    U16Value,
    U32Value,
    U64Type,
    U64Value,
    VariadicValue,
} from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { elrondConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftToken } from 'src/modules/tokens/models/nftToken.model';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { UnlockType } from '../models/simple.lock.energy.model';

@Injectable()
export class EnergyTransactionService {
    constructor(private readonly elrondProxy: ElrondProxyService) {}

    async lockTokens(
        unlockedTokens: EsdtToken,
        amount: string,
        lockEpochs: number,
    ): Promise<TransactionModel> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();

        return contract.methodsExplicit
            .lockTokens([new U64Value(new BigNumber(lockEpochs))])
            .withSingleESDTTransfer(
                TokenPayment.fungibleFromAmount(
                    unlockedTokens.identifier,
                    new BigNumber(amount),
                    unlockedTokens.decimals,
                ),
            )
            .withGasLimit(gasConfig.simpleLockEnergy.lockTokens)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async updateTokens(
        lockedTokens: NftToken,
        amount: string,
        unlockType: UnlockType,
        epochsToReduce = 0,
    ): Promise<TransactionModel> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();

        let endpoint: Interaction;
        switch (unlockType) {
            case UnlockType.TERM_UNLOCK:
                endpoint = contract.methodsExplicit.unlockTokens();
                break;
            case UnlockType.EARLY_UNLOCK:
                endpoint = contract.methodsExplicit.unlockEarly();
                break;
            case UnlockType.REDUCE_PERIOD:
                endpoint = contract.methodsExplicit.reduceLockPeriod([
                    new U64Value(new BigNumber(epochsToReduce)),
                ]);
        }

        return endpoint
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromAmount(
                    lockedTokens.identifier,
                    lockedTokens.nonce,
                    new BigNumber(amount),
                    lockedTokens.decimals,
                ),
                contract.getAddress(),
            )
            .withGasLimit(gasConfig.simpleLockEnergy.updateTokens)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    // Only owner transaction
    async issueLockedToken(
        tokenDisplayName: string,
        tokenTicker: string,
        decimals: number,
    ): Promise<TransactionModel> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();

        return contract.methodsExplicit
            .issueLockedToken([
                new StringValue(tokenDisplayName),
                new StringValue(tokenTicker),
                new U32Value(new BigNumber(decimals)),
            ])
            .withGasLimit(gasConfig.simpleLockEnergy.admin.issueLockedToken)
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
