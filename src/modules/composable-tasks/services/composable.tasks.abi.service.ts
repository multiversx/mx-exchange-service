import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { Injectable } from '@nestjs/common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { IComposableTasksAbiService } from '../interfaces';
import BigNumber from 'bignumber.js';
import { constantsConfig, scAddress } from 'src/config';
import { CacheService } from 'src/services/caching/cache.service';

@Injectable()
export class ComposableTasksAbiService
    extends GenericAbiService
    implements IComposableTasksAbiService
{
    constructor(
        protected readonly mxProxy: MXProxyService,
        private readonly cachingService: CacheService,
    ) {
        super(mxProxy);
    }

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'composableTasks',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async smartSwapFeePercentage(): Promise<number> {
        const feePercentage = await this.getSmartSwapFeePercentageRaw();
        return new BigNumber(feePercentage)
            .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
            .toNumber();
    }

    async getSmartSwapFeePercentageRaw(): Promise<number> {
        const abi = await this.mxProxy.getComposableTasksAbi();
        const response = await this.getGenericData(
            abi,
            scAddress.composableTasks,
            'getSmartSwapFeePercentage',
        );
        return response.firstValue.valueOf().toNumber();
    }
}
