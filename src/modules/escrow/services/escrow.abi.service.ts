import { Address, AddressValue, Interaction } from '@multiversx/sdk-core/out';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { Logger } from 'winston';
import { ScheduledTransferModel } from '../models/escrow.model';

@Injectable()
export class EscrowAbiService extends GenericAbiService {
    constructor(
        protected readonly mxProxy: MXProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(mxProxy, logger);
    }

    async getScheduledTransfers(
        receiverAddress: string,
    ): Promise<ScheduledTransferModel[]> {
        const contract = await this.mxProxy.getEscrowContract();
        const interaction: Interaction =
            contract.methodsExplicit.getScheduledTransfers([
                new AddressValue(Address.fromString(receiverAddress)),
            ]);
        const response = await this.getGenericData(interaction);
        return response.values.map(
            (rawValue) => new ScheduledTransferModel(rawValue.valueOf()),
        );
    }

    async getAllSenders(receiverAddress: string): Promise<string[]> {
        const contract = await this.mxProxy.getEscrowContract();
        const interaction: Interaction = contract.methodsExplicit.getAllSenders(
            [new AddressValue(Address.fromString(receiverAddress))],
        );
        const response = await this.getGenericData(interaction);
        return response.values.map((rawAddress) => rawAddress.valueOf());
    }

    async getEnergyFactoryAddress(): Promise<string> {
        return '';
    }
}
