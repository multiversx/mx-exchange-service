import { Energy, EnergyType } from '@multiversx/sdk-exchange';
import {
    Address,
    AddressValue,
    BigUIntValue,
    Interaction,
    U64Value,
} from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { LockOption } from '../models/simple.lock.energy.model';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { scAddress } from 'src/config';
import { IEnergyAbiService } from './interfaces';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';

@Injectable()
export class EnergyAbiService
    extends GenericAbiService
    implements IEnergyAbiService
{
    constructor(
        protected readonly mxProxy: MXProxyService,
        private readonly mxAPI: MXApiService,
    ) {
        super(mxProxy);
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'energy',
        remoteTtl: CacheTtlInfo.TokenID.remoteTtl,
        localTtl: CacheTtlInfo.TokenID.localTtl,
    })
    async baseAssetTokenID(): Promise<string> {
        return this.getBaseAssetTokenIDRaw();
    }

    async getBaseAssetTokenIDRaw(): Promise<string> {
        const contract = await this.mxProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getBaseAssetTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'energy',
        remoteTtl: CacheTtlInfo.TokenID.remoteTtl,
        localTtl: CacheTtlInfo.TokenID.localTtl,
    })
    async lockedTokenID(): Promise<string> {
        return this.getLockedTokenIDRaw();
    }

    async getLockedTokenIDRaw(): Promise<string> {
        const contract = await this.mxProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLockedTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'energy',
        remoteTtl: CacheTtlInfo.TokenID.remoteTtl,
        localTtl: CacheTtlInfo.TokenID.localTtl,
    })
    async legacyLockedTokenID(): Promise<string> {
        return this.getLegacyLockedTokenIDRaw();
    }

    async getLegacyLockedTokenIDRaw(): Promise<string> {
        const contract = await this.mxProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLegacyLockedTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'energy',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async lockOptions(): Promise<LockOption[]> {
        return this.getLockOptionsRaw();
    }

    async getLockOptionsRaw(): Promise<LockOption[]> {
        const contract = await this.mxProxy.getSimpleLockEnergySmartContract();
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

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'energy',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async tokenUnstakeScAddress(): Promise<string> {
        return this.getTokenUnstakeScAddressRaw();
    }

    async getTokenUnstakeScAddressRaw(): Promise<string> {
        const contract = await this.mxProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getTokenUnstakeScAddress();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().bech32();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'energy',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async ownerAddress(): Promise<string> {
        return this.getOwnerAddressRaw();
    }

    async getOwnerAddressRaw(): Promise<string> {
        return (await this.mxAPI.getAccountStats(scAddress.simpleLockEnergy))
            .ownerAddress;
    }

    @ErrorLoggerAsync()
    async energyEntryForUser(userAddress: string): Promise<EnergyType> {
        return this.getEnergyEntryForUserRaw(userAddress);
    }

    async getEnergyEntryForUserRaw(userAddress: string): Promise<EnergyType> {
        const contract = await this.mxProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getEnergyEntryForUser([
                new AddressValue(Address.fromString(userAddress)),
            ]);

        const response = await this.getGenericData(interaction);
        const rawEnergy = response.firstValue.valueOf();
        return Energy.fromDecodedAttributes(rawEnergy).toJSON();
    }

    @ErrorLoggerAsync()
    async energyAmountForUser(userAddress: string): Promise<string> {
        return this.getEnergyAmountForUserRaw(userAddress);
    }

    async getEnergyAmountForUserRaw(userAddress: string): Promise<string> {
        const contract = await this.mxProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getEnergyAmountForUser([
                new AddressValue(Address.fromString(userAddress)),
            ]);

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getPenaltyAmount(
        tokenAmount: BigNumber,
        prevLockEpochs: number,
        epochsToReduce: number,
    ): Promise<string> {
        const contract = await this.mxProxy.getSimpleLockEnergySmartContract();

        const interaction: Interaction =
            contract.methodsExplicit.getPenaltyAmount([
                new BigUIntValue(tokenAmount),
                new U64Value(new BigNumber(prevLockEpochs)),
                new U64Value(new BigNumber(epochsToReduce)),
            ]);

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'energy',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async isPaused(): Promise<boolean> {
        return this.isPausedRaw();
    }

    async isPausedRaw(): Promise<boolean> {
        const contract = await this.mxProxy.getSimpleLockEnergySmartContract();
        const interaction = contract.methodsExplicit.isPaused();
        const response = await this.getGenericData(interaction);

        return response.firstValue.valueOf();
    }
}
