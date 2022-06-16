import { Inject, Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ElrondProxyService } from '../../../../services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';

@Injectable()
export class AbiProxyFarmService extends GenericAbiService {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(elrondProxy, logger);
    }

    async getWrappedFarmTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getWrappedFarmTokenId();
        const response = await this.getGenericData(
            AbiProxyFarmService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getIntermediatedFarmsAddress(): Promise<string[]> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();

        const interaction: Interaction = contract.methodsExplicit.getIntermediatedFarms();
        const response = await this.getGenericData(
            AbiProxyFarmService.name,
            interaction,
        );
        return response.firstValue.valueOf().map(farmAddress => {
            return farmAddress.valueOf().toString();
        });
    }
}
