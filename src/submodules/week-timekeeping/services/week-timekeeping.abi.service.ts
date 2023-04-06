import { Interaction, SmartContract } from '@multiversx/sdk-core';
import { scAddress } from 'src/config';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from '../../../services/generics/generic.abi.service';
import { IWeekTimekeepingAbiService } from '../interfaces';

export class WeekTimekeepingAbiService
    extends GenericAbiService
    implements IWeekTimekeepingAbiService
{
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    async getCurrentWeek(scAddress: string): Promise<number> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getCurrentWeek();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async firstWeekStartEpoch(scAddress: string): Promise<number> {
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
