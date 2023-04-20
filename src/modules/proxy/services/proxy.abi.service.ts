import { Injectable } from '@nestjs/common';
import { Interaction } from '@multiversx/sdk-core/out/smartcontracts/interaction';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { ErrorLoggerAsync } from 'src/helpers/decorators/error.logger';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

@Injectable()
export class ProxyAbiService extends GenericAbiService {
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    @ErrorLoggerAsync({
        className: ProxyAbiService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'proxy',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async assetTokenID(proxyAddress: string): Promise<string> {
        return this.getAssetTokenIDRaw(proxyAddress);
    }

    async getAssetTokenIDRaw(proxyAddress: string): Promise<string> {
        const contract = await this.mxProxy.getProxyDexSmartContract(
            proxyAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getAssetTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        className: ProxyAbiService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'proxy',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async lockedAssetTokenID(proxyAddress: string): Promise<string[]> {
        return this.getLockedAssetTokenIDRaw(proxyAddress);
    }

    async getLockedAssetTokenIDRaw(proxyAddress: string): Promise<string[]> {
        const contract = await this.mxProxy.getProxyDexSmartContract(
            proxyAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLockedAssetTokenId();
        const response = await this.getGenericData(interaction);
        return [response.firstValue.valueOf().toString()];
    }
}
