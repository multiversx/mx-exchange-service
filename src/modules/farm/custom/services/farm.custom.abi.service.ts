import { Address, Interaction } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { FarmAbiService } from '../../base-module/services/farm.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { oneHour } from 'src/helpers/helpers';
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
        remoteTtl: oneHour(),
    })
    async whitelist(farmAddress: string): Promise<string[]> {
        return await this.getWhitelistRaw(farmAddress);
    }

    async getWhitelistRaw(farmAddress: string): Promise<string[]> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);

        const interaction: Interaction =
            contract.methodsExplicit.getWhitelist();
        const response = await this.getGenericData(interaction);

        return response.firstValue
            .valueOf()
            .map((address: Address) => address.bech32());
    }
}
