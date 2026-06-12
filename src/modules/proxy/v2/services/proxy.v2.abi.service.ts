import { TokenIdentifierValue } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { ProxyAbiService } from '../../services/proxy.abi.service';
import { IProxyAbiService } from '../../services/interfaces';

@Injectable()
export class ProxyAbiServiceV2
    extends ProxyAbiService
    implements IProxyAbiService
{
    async getLockedAssetTokenIDRaw(proxyAddress: string): Promise<string[]> {
        const abi = await this.mxProxy.getProxyDexAbi(proxyAddress);
        const response = await this.getGenericData(
            abi,
            proxyAddress,
            'getLockedTokenIds',
        );
        return response.firstValue
            .valueOf()
            .map((tokenID: TokenIdentifierValue) => tokenID.valueOf());
    }
}
