import { Inject, Injectable } from '@nestjs/common';
import { ProxyModel } from '../models/proxy.model';
import { WrappedLpTokenAttributesModel } from '../models/wrappedLpTokenAttributes.model';
import { WrappedFarmTokenAttributesModel } from '../models/wrappedFarmTokenAttributes.model';
import { scAddress } from '../../../config';
import { FarmService } from '../../farm/services/farm.service';
import { DecodeAttributesArgs } from '../models/proxy.args';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import {
    FarmTokenAttributes,
    WrappedFarmTokenAttributes,
    WrappedLpTokenAttributes,
} from '@elrondnetwork/erdjs-dex';
import { decimalToHex } from 'src/utils/token.converters';
import { farmVersion } from 'src/utils/farm.utils';
import { FarmTokenAttributesModel } from 'src/modules/farm/models/farmTokenAttributes.model';

@Injectable()
export class ProxyService {
    constructor(
        private readonly apiService: ElrondApiService,
        private farmService: FarmService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getProxyInfo(): Promise<ProxyModel> {
        return new ProxyModel({ address: scAddress.proxyDexAddress });
    }

    getWrappedLpTokenAttributes(
        args: DecodeAttributesArgs,
    ): WrappedLpTokenAttributesModel[] {
        return args.batchAttributes.map(arg => {
            return new WrappedLpTokenAttributesModel(
                WrappedLpTokenAttributes.fromAttributes(
                    arg.attributes,
                ).toJSON(),
            );
        });
    }

    async getWrappedFarmTokenAttributes(
        args: DecodeAttributesArgs,
    ): Promise<WrappedFarmTokenAttributesModel[]> {
        const promises = args.batchAttributes.map(async arg => {
            const wrappedFarmTokenAttributes = WrappedFarmTokenAttributes.fromAttributes(
                arg.attributes,
            );
            const farmTokenIdentifier = `${
                wrappedFarmTokenAttributes.farmTokenID
            }-${decimalToHex(wrappedFarmTokenAttributes.farmTokenNonce)}`;
            const farmToken = await this.apiService.getNftByTokenIdentifier(
                scAddress.proxyDexAddress,
                farmTokenIdentifier,
            );
            const farmAddress = await this.farmService.getFarmAddressByFarmTokenID(
                farmToken.collection,
            );
            const farmTokenAttributes = FarmTokenAttributes.fromAttributes(
                farmVersion(farmAddress),
                farmToken.attributes,
            );

            return new WrappedFarmTokenAttributesModel({
                ...wrappedFarmTokenAttributes.toJSON(),
                identifier: arg.identifier,
                attributes: arg.attributes,
                farmTokenIdentifier,
                farmTokenAttributes: new FarmTokenAttributesModel(
                    farmTokenAttributes.toJSON(),
                ),
            });
        });

        return Promise.all(promises);
    }
}
