import { Inject, Injectable } from '@nestjs/common';
import { GenericAbiService } from '../../../services/generics/generic.abi.service';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Interaction } from '@multiversx/sdk-core';

@Injectable()
export class LockedTokenWrapperAbiService extends GenericAbiService {
    constructor(
        protected readonly mxProxy: MXProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(mxProxy, logger);
    }

    async lockedTokenId(address: string): Promise<string> {
        const contract = await this.mxProxy.getLockedTokenWrapperContract(
            address,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLockedTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
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
