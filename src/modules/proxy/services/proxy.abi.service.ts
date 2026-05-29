import { Injectable } from '@nestjs/common';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { IProxyAbiService } from './interfaces';

@Injectable()
export class ProxyAbiService
    extends GenericAbiService
    implements IProxyAbiService
{
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'proxy',
        remoteTtl: CacheTtlInfo.TokenID.remoteTtl,
        localTtl: CacheTtlInfo.TokenID.localTtl,
    })
    async assetTokenID(proxyAddress: string): Promise<string> {
        return this.getAssetTokenIDRaw(proxyAddress);
    }

    async getAssetTokenIDRaw(proxyAddress: string): Promise<string> {
        const abi = await this.mxProxy.getProxyDexAbi(proxyAddress);
        const response = await this.getGenericData(
            abi,
            proxyAddress,
            'getAssetTokenId',
        );
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'proxy',
        remoteTtl: CacheTtlInfo.TokenID.remoteTtl,
        localTtl: CacheTtlInfo.TokenID.localTtl,
    })
    async lockedAssetTokenID(proxyAddress: string): Promise<string[]> {
        return this.getLockedAssetTokenIDRaw(proxyAddress);
    }

    async getLockedAssetTokenIDRaw(proxyAddress: string): Promise<string[]> {
        const abi = await this.mxProxy.getProxyDexAbi(proxyAddress);
        const response = await this.getGenericData(
            abi,
            proxyAddress,
            'getLockedAssetTokenId',
        );
        return [response.firstValue.valueOf().toString()];
    }
}
