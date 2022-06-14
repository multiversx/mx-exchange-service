import { Inject, Injectable } from '@nestjs/common';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';

@Injectable()
export class AbiProxyPairService extends GenericAbiService {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(elrondProxy, logger);
    }

    async getWrappedLpTokenID(): Promise<string> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();
        const interaction: Interaction = contract.methodsExplicit.getWrappedLpTokenId(
            [],
        );
        const response = await this.getGenericData(
            AbiProxyPairService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getIntermediatedPairsAddress(): Promise<string[]> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();

        const interaction: Interaction = contract.methodsExplicit.getIntermediatedPairs(
            [],
        );
        const response = await this.getGenericData(
            AbiProxyPairService.name,
            interaction,
        );
        return response.firstValue.valueOf().map(pairAddress => {
            return pairAddress.valueOf().toString();
        });
    }
}
