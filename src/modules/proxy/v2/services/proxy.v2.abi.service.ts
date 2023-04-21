import { Interaction, TokenIdentifierValue } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { ProxyAbiService } from '../../services/proxy.abi.service';
import { IProxyAbiService } from '../../services/interfaces';

@Injectable()
export class ProxyAbiServiceV2
    extends ProxyAbiService
    implements IProxyAbiService
{
    async getLockedAssetTokenIDRaw(proxyAddress: string): Promise<string[]> {
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
