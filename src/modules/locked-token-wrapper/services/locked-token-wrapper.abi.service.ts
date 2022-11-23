import { Inject, Injectable } from '@nestjs/common';
import { GenericAbiService } from '../../../services/generics/generic.abi.service';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Interaction } from '@elrondnetwork/erdjs/out';

@Injectable()
export class LockedTokenWrapperAbiService extends GenericAbiService {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(elrondProxy, logger);
    }

    async lockedTokenId(address: string): Promise<string> {
        const contract = await this.elrondProxy.getLockedTokenWrapperContract(address);
        const interaction: Interaction = contract.methodsExplicit.getLockedTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async wrappedTokenId(address: string): Promise<string> {
        const contract = await this.elrondProxy.getLockedTokenWrapperContract(address);
        const interaction: Interaction = contract.methodsExplicit.getWrappedTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }
}
