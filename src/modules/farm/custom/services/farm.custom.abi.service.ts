import { Address } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { FarmAbiService } from '../../base-module/services/farm.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { IFarmCustomAbiService } from './interfaces';

@Injectable()
export class FarmCustomAbiService
    extends FarmAbiService
    implements IFarmCustomAbiService
{
    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: Constants.oneHour(),
    })
    async whitelist(farmAddress: string): Promise<string[]> {
        return this.getWhitelistRaw(farmAddress);
    }

    async getWhitelistRaw(farmAddress: string): Promise<string[]> {
        const abi = await this.mxProxy.getFarmAbi(farmAddress);
        const response = await this.getGenericData(
            abi,
            farmAddress,
            'getWhitelist',
        );

        return response.firstValue
            .valueOf()
            .map((address: Address) => address.toBech32());
    }
}
