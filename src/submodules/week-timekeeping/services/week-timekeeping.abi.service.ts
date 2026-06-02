import { AbiRegistry } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { scAddress } from 'src/config';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from '../../../services/generics/generic.abi.service';
import { IWeekTimekeepingAbiService } from '../interfaces';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';

@Injectable()
export class WeekTimekeepingAbiService
    extends GenericAbiService
    implements IWeekTimekeepingAbiService
{
    constructor(
        protected readonly mxProxy: MXProxyService,
        private readonly remoteConfig: RemoteConfigGetterService,
    ) {
        super(mxProxy);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'weekTimekeeping',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async currentWeek(scAddress: string): Promise<number> {
        return await this.getCurrentWeekRaw(scAddress);
    }

    async getCurrentWeekRaw(scAddress: string): Promise<number> {
        const abi = await this.getAbiHandler(scAddress);
        const response = await this.getGenericData(
            abi,
            scAddress,
            'getCurrentWeek',
        );
        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'weekTimekeeping',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async firstWeekStartEpoch(scAddress: string): Promise<number> {
        return await this.firstWeekStartEpochRaw(scAddress);
    }

    async firstWeekStartEpochRaw(scAddress: string): Promise<number> {
        const abi = await this.getAbiHandler(scAddress);
        const response = await this.getGenericData(
            abi,
            scAddress,
            'getFirstWeekStartEpoch',
        );
        return response.firstValue.valueOf().toNumber();
    }

    private async getAbiHandler(
        contractAddress: string,
    ): Promise<AbiRegistry> {
        if (scAddress.feesCollector === contractAddress) {
            return this.mxProxy.getFeesCollectorAbi();
        }

        const stakingAddresses = await this.remoteConfig.getStakingAddresses();
        if (stakingAddresses.includes(contractAddress)) {
            return this.mxProxy.getStakingAbi();
        }

        return this.mxProxy.getFarmAbi(contractAddress);
    }
}
