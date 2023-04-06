import { Address, AddressValue, Interaction } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { UserEntryModel } from '../models/metabonding.model';

@Injectable()
export class MetabondingAbiService extends GenericAbiService {
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    async getLockedAssetTokenID(): Promise<string> {
        const contract =
            await this.mxProxy.getMetabondingStakingSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLockedAssetTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getTotalLockedAssetSupply(): Promise<string> {
        const contract =
            await this.mxProxy.getMetabondingStakingSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getTotalLockedAssetSupply();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getStakedAmountForUser(userAddress: string): Promise<string> {
        const contract =
            await this.mxProxy.getMetabondingStakingSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getStakedAmountForUser([
                new AddressValue(Address.fromString(userAddress)),
            ]);

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async getUserEntry(userAddress: string): Promise<UserEntryModel> {
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
