import { Inject, Injectable } from '@nestjs/common';
import { ProxyModel } from '../models/proxy.model';
import { WrappedLpTokenAttributesModel } from '../models/wrappedLpTokenAttributes.model';
import { WrappedFarmTokenAttributesModel } from '../models/wrappedFarmTokenAttributes.model';
import { scAddress } from '../../../config';
import { FarmService } from '../../farm/base-module/services/farm.service';
import {
    DecodeAttributesArgs,
    DecodeAttributesModel,
} from '../models/proxy.args';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import {
    FarmTokenAttributes,
    WrappedFarmTokenAttributes,
    WrappedLpTokenAttributes,
} from '@elrondnetwork/erdjs-dex';
import { tokenIdentifier } from 'src/utils/token.converters';
import { farmVersion } from 'src/utils/farm.utils';
import { FarmTokenAttributesModel } from 'src/modules/farm/models/farmTokenAttributes.model';
import { ProxyGetterService } from './proxy.getter.service';
import { LockedAssetService } from 'src/modules/locked-asset-factory/services/locked-asset.service';
import { LockedAssetAttributesModel } from 'src/modules/locked-asset-factory/models/locked-asset.model';

@Injectable()
export class ProxyService {
    constructor(
        private readonly apiService: ElrondApiService,
        private readonly proxyGetter: ProxyGetterService,
        private readonly lockedAssetService: LockedAssetService,
        private farmService: FarmService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getProxyInfo(): Promise<ProxyModel> {
        return new ProxyModel({ address: scAddress.proxyDexAddress });
    }

    async getWrappedLpTokenAttributes(
        args: DecodeAttributesArgs,
    ): Promise<WrappedLpTokenAttributesModel[]> {
        const promises = args.batchAttributes.map((arg) =>
            this.decodeWrappedLpTokenAttributes(arg),
        );

        return await Promise.all(promises);
    }

    async decodeWrappedLpTokenAttributes(
        args: DecodeAttributesModel,
    ): Promise<WrappedLpTokenAttributesModel> {
        const wrappedLpTokenAttributes =
            WrappedLpTokenAttributes.fromAttributes(args.attributes);

        return new WrappedLpTokenAttributesModel({
            ...wrappedLpTokenAttributes.toJSON(),
            attributes: args.attributes,
            identifier: args.identifier,
        });
    }

    async getLockedAssetsAttributes(
        lockedAssetTokenCollection: string,
        lockedAssetNonce: number,
    ): Promise<LockedAssetAttributesModel> {
        const lockedAssetToken = await this.apiService.getNftByTokenIdentifier(
            scAddress.proxyDexAddress,
            tokenIdentifier(lockedAssetTokenCollection, lockedAssetNonce),
        );
        const lockedAssetAttributes =
            await this.lockedAssetService.decodeLockedAssetAttributes({
                batchAttributes: [
                    {
                        attributes: lockedAssetToken.attributes,
                        identifier: lockedAssetToken.identifier,
                    },
                ],
            });

        return lockedAssetAttributes[0];
    }

    async getWrappedFarmTokenAttributes(
        args: DecodeAttributesArgs,
    ): Promise<WrappedFarmTokenAttributesModel[]> {
        const promises = args.batchAttributes.map((arg) =>
            this.decodeWrappedFarmTokenAttributes(arg),
        );

        return await Promise.all(promises);
    }

    async decodeWrappedFarmTokenAttributes(
        arg: DecodeAttributesModel,
    ): Promise<WrappedFarmTokenAttributesModel> {
        const wrappedFarmTokenAttributes =
            WrappedFarmTokenAttributes.fromAttributes(arg.attributes);
        const farmTokenIdentifier = tokenIdentifier(
            wrappedFarmTokenAttributes.farmTokenID,
            wrappedFarmTokenAttributes.farmTokenNonce,
        );

        return new WrappedFarmTokenAttributesModel({
            ...wrappedFarmTokenAttributes.toJSON(),
            identifier: arg.identifier,
            attributes: arg.attributes,
            farmTokenIdentifier,
        });
    }

    async getFarmTokenAttributes(
        farmTokenCollection: string,
        farmTokenNonce: number,
    ): Promise<FarmTokenAttributesModel> {
        const farmToken = await this.apiService.getNftByTokenIdentifier(
            scAddress.proxyDexAddress,
            tokenIdentifier(farmTokenCollection, farmTokenNonce),
        );
        const farmAddress = await this.farmService.getFarmAddressByFarmTokenID(
            farmToken.collection,
        );

        return new FarmTokenAttributesModel({
            ...FarmTokenAttributes.fromAttributes(
                farmVersion(farmAddress),
                farmToken.attributes,
            ).toJSON(),
            attributes: farmToken.attributes,
            identifier: farmToken.identifier,
        });
    }
}
