import { Interaction, SmartContract } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { scAddress } from 'src/config';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from '../../../services/generics/generic.abi.service';
import { IWeekTimekeepingAbiService } from '../interfaces';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

@Injectable()
export class WeekTimekeepingAbiService
    extends GenericAbiService
    implements IWeekTimekeepingAbiService
{
    constructor(protected readonly mxProxy: MXProxyService) {
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
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getCurrentWeek();
        const response = await this.getGenericData(interaction);
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
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getFirstWeekStartEpoch();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    private getContractHandler(
        contractAddress: string,
    ): Promise<SmartContract> {
        if (scAddress.feesCollector === contractAddress) {
            return this.mxProxy.getFeesCollectorContract();
        }

        return this.mxProxy.getFarmSmartContract(contractAddress);
    }
}
