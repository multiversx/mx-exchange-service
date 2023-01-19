import { Interaction, TokenIdentifierValue } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { AbiProxyService } from '../../services/proxy-abi.service';

@Injectable()
export class ProxyAbiServiceV2 extends AbiProxyService {
    async getLockedAssetTokenID(proxyAddress: string): Promise<string[]> {
        const contract = await this.mxProxy.getProxyDexSmartContract(
            proxyAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLockedTokenIds();
        const response = await this.getGenericData(interaction);
        return response.firstValue
            .valueOf()
            .map((tokenID: TokenIdentifierValue) => tokenID.valueOf());
    }
}
