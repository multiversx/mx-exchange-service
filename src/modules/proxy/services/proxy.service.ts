import { Inject, Injectable } from '@nestjs/common';
import { ProxyModel } from '../models/proxy.model';
import { WrappedLpTokenAttributesModel } from '../models/wrappedLpTokenAttributes.model';
import { WrappedFarmTokenAttributesModel } from '../models/wrappedFarmTokenAttributes.model';
import { scAddress } from '../../../config';
import {
    DecodeAttributesArgs,
    DecodeAttributesModel,
} from '../models/proxy.args';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import {
    FarmTokenAttributesV1_2,
    FarmTokenAttributesV1_3,
    WrappedFarmTokenAttributes,
    WrappedLpTokenAttributes,
} from '@elrondnetwork/erdjs-dex';
import { tokenIdentifier } from 'src/utils/token.converters';
import { farmVersion } from 'src/utils/farm.utils';
import {
    FarmTokenAttributesModelV1_2,
    FarmTokenAttributesModelV1_3,
    FarmTokenAttributesUnion,
} from 'src/modules/farm/models/farmTokenAttributes.model';
import { LockedAssetService } from 'src/modules/locked-asset-factory/services/locked-asset.service';
import { LockedAssetAttributesModel } from 'src/modules/locked-asset-factory/models/locked-asset.model';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { FarmGetterFactory } from 'src/modules/farm/farm.getter.factory';
import { ProxyGetterService } from './proxy.getter.service';
import { ProxyPairGetterService } from './proxy-pair/proxy-pair.getter.service';
import { ProxyFarmGetterService } from './proxy-farm/proxy-farm.getter.service';

@Injectable()
export class ProxyService {
    constructor(
        private readonly proxyGetter: ProxyGetterService,
        private readonly proxyPairGetter: ProxyPairGetterService,
        private readonly proxyFarmGetter: ProxyFarmGetterService,
        private readonly farmGetter: FarmGetterFactory,
        private readonly apiService: ElrondApiService,
        private readonly lockedAssetService: LockedAssetService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getProxyInfo(): Promise<ProxyModel[]> {
        const proxies: ProxyModel[] = [];
        for (const address of scAddress.proxyDexAddress) {
            proxies.push(new ProxyModel({ address }));
        }
        return proxies;
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
    ): Promise<typeof FarmTokenAttributesUnion> {
        const farmToken = await this.apiService.getNftByTokenIdentifier(
            scAddress.proxyDexAddress,
            tokenIdentifier(farmTokenCollection, farmTokenNonce),
        );
        const farmAddress = await this.farmGetter.getFarmAddressByFarmTokenID(
            farmToken.collection,
        );
        const version = farmVersion(farmAddress);

        switch (version) {
            case FarmVersion.V1_2:
                return new FarmTokenAttributesModelV1_2({
                    ...FarmTokenAttributesV1_2.fromAttributes(
                        farmToken.attributes,
                    ).toJSON(),
                    attributes: farmToken.attributes,
                    identifier: farmToken.identifier,
                });
            case FarmVersion.V1_3:
                return new FarmTokenAttributesModelV1_3({
                    ...FarmTokenAttributesV1_3.fromAttributes(
                        farmToken.attributes,
                    ).toJSON(),
                    attributes: farmToken.attributes,
                    identifier: farmToken.identifier,
                });
        }
    }

    async getProxyAddressByToken(tokenID: string): Promise<string> {
        const proxyAddresses = scAddress.proxyDexAddress;

        for (const address of proxyAddresses) {
            const [lockedTokenID, proxyLpTokenID, proxyFarmTokenID] =
                await Promise.all([
                    this.proxyGetter.getLockedAssetTokenID(address),
                    this.proxyPairGetter.getwrappedLpTokenID(address),
                    this.proxyFarmGetter.getwrappedFarmTokenID(address),
                ]);

            if (
                tokenID === lockedTokenID ||
                tokenID === proxyLpTokenID ||
                tokenID === proxyFarmTokenID
            ) {
                return address;
            }
        }

        throw new Error('invalid locked token identifier');
    }
}
