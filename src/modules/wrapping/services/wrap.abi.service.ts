import { Injectable } from '@nestjs/common';
import { scAddress } from 'src/config';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';

@Injectable()
export class WrapAbiService extends GenericAbiService {
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'wrap',
        remoteTtl: CacheTtlInfo.TokenID.remoteTtl,
        localTtl: CacheTtlInfo.TokenID.localTtl,
    })
    async wrappedEgldTokenID(): Promise<string> {
        return this.getWrappedEgldTokenIDRaw();
    }

    async getWrappedEgldTokenIDRaw(): Promise<string> {
        const abi = await this.mxProxy.getWrapAbi();
        const response = await this.getGenericData(
            abi,
            scAddress.wrappingAddress.get('shardID-1'),
            'getWrappedEgldTokenId',
        );
        return response.firstValue.valueOf().toString();
    }
}
