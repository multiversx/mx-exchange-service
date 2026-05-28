import { Injectable } from '@nestjs/common';
import { GenericAbiService } from '../../../services/generics/generic.abi.service';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { scAddress } from 'src/config';

@Injectable()
export class LockedTokenWrapperAbiService extends GenericAbiService {
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'lockedTokenWrapper',
        remoteTtl: CacheTtlInfo.TokenID.remoteTtl,
        localTtl: CacheTtlInfo.TokenID.localTtl,
    })
    async wrappedTokenId(): Promise<string> {
        return this.wrappedTokenIdRaw();
    }

    async wrappedTokenIdRaw(): Promise<string> {
        const abi = await this.mxProxy.getLockedTokenWrapperAbi();
        const response = await this.getGenericData(
            abi,
            scAddress.lockedTokenWrapper,
            'getWrappedTokenId',
        );
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'lockedTokenWrapper',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async energyFactoryAddress(): Promise<string> {
        return this.energyFactoryAddressRaw();
    }

    async energyFactoryAddressRaw(): Promise<string> {
        const abi = await this.mxProxy.getLockedTokenWrapperAbi();
        const response = await this.getGenericData(
            abi,
            scAddress.lockedTokenWrapper,
            'getEnergyFactoryAddress',
        );
        return response.firstValue.valueOf().toBech32();
    }
}
