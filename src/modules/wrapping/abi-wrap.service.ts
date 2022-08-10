import { Inject, Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ElrondProxyService } from '../../services/elrond-communication/services/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';

@Injectable()
export class AbiWrapService extends GenericAbiService {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(elrondProxy, logger);
    }

    async getWrappedEgldTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getWrapSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getWrappedEgldTokenId();
        const response = await this.getGenericData(
            AbiWrapService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }
}
