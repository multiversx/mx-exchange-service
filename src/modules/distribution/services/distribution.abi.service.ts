import { Injectable } from '@nestjs/common';
import { Address, AddressValue, Interaction } from '@multiversx/sdk-core';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import BigNumber from 'bignumber.js';
import { CommunityDistributionModel } from '../models/distribution.model';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';

@Injectable()
export class DistributionAbiService extends GenericAbiService {
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'communityDistribution',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async communityDistribution(): Promise<CommunityDistributionModel> {
        return await this.getCommunityDistributionRaw();
    }

    async getCommunityDistributionRaw(): Promise<CommunityDistributionModel> {
        const contract = await this.mxProxy.getDistributionSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLastCommunityDistributionAmountAndEpoch();
        const response = await this.getGenericData(interaction);
        return new CommunityDistributionModel({
            amount: response.values[0].valueOf(),
            epoch: response.values[1].valueOf(),
        });
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'distributedLockedAssets',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async distributedLockedAssets(userAddress: string): Promise<BigNumber> {
        return await this.getDistributedLockedAssetsRaw(userAddress);
    }

    async getDistributedLockedAssetsRaw(
        userAddress: string,
    ): Promise<BigNumber> {
        const contract = await this.mxProxy.getDistributionSmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.calculateLockedAssets([
                new AddressValue(Address.fromString(userAddress)),
            ]);

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }
}
