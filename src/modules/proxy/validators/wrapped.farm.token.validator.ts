import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UserInputError } from 'apollo-server-express';
import { ExitFarmProxyArgs } from '../models/proxy-farm.args';
import { ProxyFarmGetterService } from '../services/proxy-farm/proxy-farm.getter.service';
import { ProxyService } from '../services/proxy.service';

@Injectable()
export class WrappedFarmValidationPipe implements PipeTransform {
    constructor(
        private readonly proxyService: ProxyService,
        private readonly proxyFarmGetter: ProxyFarmGetterService,
    ) {}

    async transform(value: ExitFarmProxyArgs, metadata: ArgumentMetadata) {
        if (value.wrappedFarmTokenNonce < 1) {
            throw new UserInputError('invalid meta esdt token');
        }
        const proxyAddress = await this.proxyService.getProxyAddressByToken(
            value.wrappedFarmTokenID,
        );
        const intermediatedFarms =
            await this.proxyFarmGetter.getIntermediatedFarms(proxyAddress);
        if (!intermediatedFarms.includes(value.farmAddress)) {
            throw new UserInputError('not an intermediated farm');
        }

        return value;
    }
}
