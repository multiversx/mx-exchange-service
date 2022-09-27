import {
    Address,
    AddressValue,
    U16Value,
    U64Type,
    U64Value,
    VariadicValue,
} from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { elrondConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { TransactionsWrapService } from 'src/modules/wrapping/transactions-wrap.service';
import { WrapService } from 'src/modules/wrapping/wrap.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { SimpleLockType } from '../../models/simple.lock.model';
import { SimpleLockGetterService } from '../simple.lock.getter.service';
import { SimpleLockService } from '../simple.lock.service';
import { SimpleLockTransactionService } from '../simple.lock.transactions.service';

@Injectable()
export class EnergyTransactionService extends SimpleLockTransactionService {
    constructor(
        protected readonly simpleLockService: SimpleLockService,
        protected readonly simpleLockGetter: SimpleLockGetterService,
        protected readonly pairService: PairService,
        protected readonly pairGetterService: PairGetterService,
        protected readonly wrapService: WrapService,
        protected readonly wrapTransaction: TransactionsWrapService,
        protected readonly contextGetter: ContextGetterService,
        protected readonly elrondProxy: ElrondProxyService,
    ) {
        super(
            simpleLockService,
            simpleLockGetter,
            pairService,
            pairGetterService,
            wrapService,
            wrapTransaction,
            contextGetter,
            elrondProxy,
        );
        this.lockType = SimpleLockType.ENERGY_TYPE;
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
