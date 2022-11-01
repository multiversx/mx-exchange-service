import {
    Energy,
    EnergyType,
    LockedTokenAttributes,
} from '@elrondnetwork/erdjs-dex';
import {
    Address,
    AddressValue,
    BigUIntValue,
    Interaction,
    U64Value,
} from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { InputTokenModel } from 'src/models/inputToken.model';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { Logger } from 'winston';
import { LockOption } from '../models/simple.lock.energy.model';

@Injectable()
export class EnergyAbiService extends GenericAbiService {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly contextGetter: ContextGetterService,
    ) {
        super(elrondProxy, logger);
    }

    async getBaseAssetTokenID(): Promise<string> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getBaseAssetTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getLockedTokenId(): Promise<string> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLockedTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getLegacyLockedTokenId(): Promise<string> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLegacyLockedTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getFeesBurnPercentage(): Promise<number> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getFeesBurnPercentage();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getFeesCollectorAddress(): Promise<string> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getFeesCollectorAddress();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().bech32();
    }

    async getLastEpochFeeSentToCollector(): Promise<number> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLastEpochFeeSentToCollector();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async getLockOptions(): Promise<LockOption[]> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLockOptions();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().map(
            (lockOption: any) =>
                new LockOption({
                    lockEpochs: lockOption.lock_epochs.toNumber(),
                    penaltyStartPercentage:
                        lockOption.penalty_start_percentage.toNumber(),
                }),
        );
    }

    async getEnergyEntryForUser(userAddress: string): Promise<EnergyType> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getEnergyEntryForUser([
                new AddressValue(Address.fromString(userAddress)),
            ]);

        const response = await this.getGenericData(interaction);
        const rawEnergy = response.firstValue.valueOf();
        return Energy.fromDecodedAttributes(rawEnergy).toJSON();
    }

    async getEnergyAmountForUser(userAddress: string): Promise<string> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getEnergyAmountForUser([
                new AddressValue(Address.fromString(userAddress)),
            ]);

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getPenaltyAmount(
        inputToken: InputTokenModel,
        epochsToReduce: number,
    ): Promise<string> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();
        const decodedAttributes = LockedTokenAttributes.fromAttributes(
            inputToken.attributes,
        );
        const currentEpoch = await this.contextGetter.getCurrentEpoch();
        const interaction: Interaction =
            contract.methodsExplicit.getPenaltyAmount([
                new BigUIntValue(new BigNumber(inputToken.amount)),
                new U64Value(
                    new BigNumber(decodedAttributes.unlockEpoch).minus(
                        currentEpoch,
                    ),
                ),
                new U64Value(new BigNumber(epochsToReduce)),
            ]);

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getFeesFromPenaltyUnlocking(): Promise<number> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getFeesFromPenaltyUnlocking([]);

        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf().amount.toFixed();
    }

    async isPaused(): Promise<boolean> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();
        const interaction = contract.methodsExplicit.isPaused();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf();
    }
}
