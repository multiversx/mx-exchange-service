import { Interaction } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { AbiProxyService } from '../../services/proxy-abi.service';

@Injectable()
export class ProxyAbiServiceV1 extends AbiProxyService {
    async getLockedAssetTokenID(proxyAddress: string): Promise<string[]> {
        const contract = await this.mxProxy.getProxyDexSmartContract(
            proxyAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLockedAssetTokenId();
        const response = await this.getGenericData(interaction);
        return [response.firstValue.valueOf().toString()];
    }
}
