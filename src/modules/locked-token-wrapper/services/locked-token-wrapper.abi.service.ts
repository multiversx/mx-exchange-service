import { Injectable } from '@nestjs/common';
import { GenericAbiService } from '../../../services/generics/generic.abi.service';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { Interaction } from '@multiversx/sdk-core';

@Injectable()
export class LockedTokenWrapperAbiService extends GenericAbiService {
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    async wrappedTokenId(address: string): Promise<string> {
        const contract = await this.mxProxy.getLockedTokenWrapperContract(
            address,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getWrappedTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async energyFactoryAddress(address: string): Promise<string> {
        const contract = await this.mxProxy.getLockedTokenWrapperContract(
            address,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getEnergyFactoryAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().bech32();
    }
}
