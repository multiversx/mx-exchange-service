import { Injectable } from '@nestjs/common';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { AddressValue } from '@multiversx/sdk-core';
import { IProxyPairAbiService } from '../interfaces';

@Injectable()
export class ProxyPairAbiService
    extends GenericAbiService
    implements IProxyPairAbiService
{
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'proxyPair',
        remoteTtl: CacheTtlInfo.TokenID.remoteTtl,
        localTtl: CacheTtlInfo.TokenID.localTtl,
    })
    async wrappedLpTokenID(proxyAddress: string): Promise<string> {
        return this.getWrappedLpTokenIDRaw(proxyAddress);
    }

    async getWrappedLpTokenIDRaw(proxyAddress: string): Promise<string> {
        const abi = await this.mxProxy.getProxyDexAbi(proxyAddress);
        const response = await this.getGenericData(
            abi,
            proxyAddress,
            'getWrappedLpTokenId',
        );
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'proxyPair',
        remoteTtl: Constants.oneHour(),
    })
    async intermediatedPairs(proxyAddress: string): Promise<string[]> {
        return this.getIntermediatedPairsRaw(proxyAddress);
    }

    async getIntermediatedPairsRaw(proxyAddress: string): Promise<string[]> {
        const abi = await this.mxProxy.getProxyDexAbi(proxyAddress);
        const response = await this.getGenericData(
            abi,
            proxyAddress,
            'getIntermediatedPairs',
        );
        return response.firstValue
            .valueOf()
            .map((pairAddress: AddressValue) => {
                return pairAddress.valueOf().toString();
            });
    }
}
