import { Inject, Injectable } from '@nestjs/common';
import { ProxyModel } from '../models/proxy.model';
import { WrappedLpTokenAttributesModel } from '../models/wrappedLpTokenAttributes.model';
import { WrappedFarmTokenAttributesModel } from '../models/wrappedFarmTokenAttributes.model';
import { scAddress } from '../../../config';
import {
    decodeWrappedFarmTokenAttributes,
    decodeWrappedLPTokenAttributes,
} from '../utils';
import { FarmService } from '../../farm/services/farm.service';
import { DecodeAttributesArgs } from '../models/proxy.args';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';

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
            const decodedAttributes = decodeWrappedLPTokenAttributes(
                arg.attributes,
            );

            return new WrappedLpTokenAttributesModel({
                identifier: arg.identifier,
                attributes: arg.attributes,
                lpTokenID: decodedAttributes.lpTokenID.toString(),
                lpTokenTotalAmount: decodedAttributes.lpTokenTotalAmount.toFixed(),
                lockedAssetsInvested: decodedAttributes.lockedAssetsInvested.toFixed(),
                lockedAssetsNonce: decodedAttributes.lockedAssetsNonce.toString(),
            });
        });
    }

    async getWrappedFarmTokenAttributes(
        args: DecodeAttributesArgs,
    ): Promise<WrappedFarmTokenAttributesModel[]> {
        const promises = args.batchAttributes.map(async arg => {
            const decodedAttributes = decodeWrappedFarmTokenAttributes(
                arg.attributes,
            );

            const farmToken = await this.apiService.getNftByTokenIdentifier(
                scAddress.proxyDexAddress,
                decodedAttributes.farmTokenIdentifier,
            );
            const farmAddress = await this.farmService.getFarmAddressByFarmTokenID(
                farmToken.collection,
            );
            const decodedFarmAttributes = await this.farmService.decodeFarmTokenAttributes(
                farmAddress,
                decodedAttributes.farmTokenIdentifier,
                farmToken.attributes,
            );

            return new WrappedFarmTokenAttributesModel({
                identifier: arg.identifier,
                attributes: arg.attributes,
                farmTokenID: decodedAttributes.farmTokenID.toString(),
                farmTokenNonce: decodedAttributes.farmTokenNonce,
                farmTokenAmount: decodedAttributes.farmTokenAmount,
                farmTokenIdentifier: decodedAttributes.farmTokenIdentifier,
                farmTokenAttributes: decodedFarmAttributes,
                farmingTokenID: decodedAttributes.farmingTokenID.toString(),
                farmingTokenNonce: decodedAttributes.farmingTokenNonce,
                farmingTokenAmount: decodedAttributes.farmingTokenAmount,
            });
        });

        return Promise.all(promises);
    }
}
