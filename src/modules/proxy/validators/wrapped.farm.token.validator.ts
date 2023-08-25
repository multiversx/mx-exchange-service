import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UserInputError } from '@nestjs/apollo';
import { ExitFarmProxyArgs } from '../models/proxy-farm.args';
import { ProxyService } from '../services/proxy.service';
import { ProxyFarmAbiService } from '../services/proxy-farm/proxy.farm.abi.service';

@Injectable()
export class WrappedFarmValidationPipe implements PipeTransform {
    constructor(
        private readonly proxyService: ProxyService,
        private readonly proxyFarmAbi: ProxyFarmAbiService,
    ) {}

    async transform(value: ExitFarmProxyArgs, metadata: ArgumentMetadata) {
        if (value.wrappedFarmTokenNonce < 1) {
            throw new UserInputError('invalid meta esdt token');
        }
        const proxyAddress = await this.proxyService.getProxyAddressByToken(
            value.wrappedFarmTokenID,
        );
        const intermediatedFarms = await this.proxyFarmAbi.intermediatedFarms(
            proxyAddress,
        );
        if (!intermediatedFarms.includes(value.farmAddress)) {
            throw new UserInputError('not an intermediated farm');
        }

        return value;
    }
}
