import { Address, AddressValue, Interaction } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { UserEntryModel } from '../models/metabonding.model';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { IMetabondingAbiService } from './interfaces';

@Injectable()
export class MetabondingAbiService
    extends GenericAbiService
    implements IMetabondingAbiService
{
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'metabonding',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async lockedAssetTokenID(): Promise<string> {
        return await this.getLockedAssetTokenIDRaw();
    }

    async getLockedAssetTokenIDRaw(): Promise<string> {
        const contract =
            await this.mxProxy.getMetabondingStakingSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLockedAssetTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'metabonding',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async totalLockedAssetSupply(): Promise<string> {
        return await this.getTotalLockedAssetSupplyRaw();
    }

    async getTotalLockedAssetSupplyRaw(): Promise<string> {
        const contract =
            await this.mxProxy.getMetabondingStakingSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getTotalLockedAssetSupply();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({ logArgs: true })
    @GetOrSetCache({
        baseKey: 'metabonding',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async stakedAmountForUser(userAddress: string): Promise<string> {
        return await this.getStakedAmountForUserRaw(userAddress);
    }

    async getStakedAmountForUserRaw(userAddress: string): Promise<string> {
        const contract =
            await this.mxProxy.getMetabondingStakingSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getStakedAmountForUser([
                new AddressValue(Address.fromString(userAddress)),
            ]);

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({ logArgs: true })
    @GetOrSetCache({
        baseKey: 'metabonding',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async userEntry(userAddress: string): Promise<UserEntryModel> {
        return await this.getUserEntryRaw(userAddress);
    }

    async getUserEntryRaw(userAddress: string): Promise<UserEntryModel> {
        const contract =
            await this.mxProxy.getMetabondingStakingSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getUserEntry([
            new AddressValue(Address.fromString(userAddress)),
        ]);

        const response = await this.getGenericData(interaction);

        const rawUserEntry = response.firstValue.valueOf();

        if (!rawUserEntry) {
            return new UserEntryModel({
                tokenNonce: 0,
                stakedAmount: '0',
                unstakedAmount: '0',
            });
        }

        return new UserEntryModel({
            tokenNonce: rawUserEntry.token_nonce.toNumber(),
            stakedAmount: rawUserEntry.stake_amount.toFixed(),
            unstakedAmount: rawUserEntry.unstake_amount.toFixed(),
            unbondEpoch: rawUserEntry.unbond_epoch.toNumber(),
        });
    }
}
