import { Inject, Injectable } from '@nestjs/common';
import { Interaction } from '@multiversx/sdk-core/out/smartcontracts/interaction';
import { MXProxyService } from '../../../../services/multiversx-communication/mx.proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';

@Injectable()
export class AbiProxyFarmService extends GenericAbiService {
    constructor(
        protected readonly mxProxy: MXProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(mxProxy, logger);
    }

    async getWrappedFarmTokenID(proxyAddress: string): Promise<string> {
        const contract = await this.mxProxy.getProxyDexSmartContract(
            proxyAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getWrappedFarmTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getIntermediatedFarmsAddress(
        proxyAddress: string,
    ): Promise<string[]> {
        const contract = await this.mxProxy.getProxyDexSmartContract(
            proxyAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getIntermediatedFarms();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().map((farmAddress) => {
            return farmAddress.valueOf().toString();
        });
    }
}
