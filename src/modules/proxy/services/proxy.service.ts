import { Inject, Injectable } from '@nestjs/common';
import { ProxyModel } from '../models/proxy.model';
import {
    WrappedLpTokenAttributesModel,
    WrappedLpTokenAttributesModelV2,
} from '../models/wrappedLpTokenAttributes.model';
import {
    WrappedFarmTokenAttributesModel,
    WrappedFarmTokenAttributesModelV2,
} from '../models/wrappedFarmTokenAttributes.model';
import { scAddress } from '../../../config';
import {
    DecodeAttributesArgs,
    DecodeAttributesModel,
} from '../models/proxy.args';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import {
    FarmTokenAttributesV1_2,
    FarmTokenAttributesV1_3,
    FarmTokenAttributesV2,
    LockedTokenAttributes,
    WrappedFarmTokenAttributes,
    WrappedFarmTokenAttributesV2,
    WrappedLpTokenAttributes,
    WrappedLpTokenAttributesV2,
} from '@multiversx/sdk-exchange';
import { tokenIdentifier } from 'src/utils/token.converters';
import { farmVersion } from 'src/utils/farm.utils';
import {
    FarmTokenAttributesModelV1_2,
    FarmTokenAttributesModelV1_3,
    FarmTokenAttributesModelV2,
    FarmTokenAttributesUnion,
} from 'src/modules/farm/models/farmTokenAttributes.model';
import { LockedAssetService } from 'src/modules/locked-asset-factory/services/locked-asset.service';
import { LockedAssetAttributesModel } from 'src/modules/locked-asset-factory/models/locked-asset.model';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { FarmGetterFactory } from 'src/modules/farm/farm.getter.factory';
import { ProxyPairGetterService } from './proxy-pair/proxy-pair.getter.service';
import { ProxyFarmGetterService } from './proxy-farm/proxy-farm.getter.service';
import { ProxyGetterService } from './proxy.getter.service';
import { ProxyGetterServiceV2 } from '../v2/services/proxy.v2.getter.service';
import { LockedTokenAttributesModel } from 'src/modules/simple-lock/models/simple.lock.model';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

@Injectable()
export class ProxyService {
    constructor(
        private readonly proxyGetter: ProxyGetterService,
        private readonly proxyGetterV2: ProxyGetterServiceV2,
        private readonly proxyPairGetter: ProxyPairGetterService,
        private readonly proxyFarmGetter: ProxyFarmGetterService,
        private readonly farmGetter: FarmGetterFactory,
        private readonly apiService: MXApiService,
        private readonly lockedAssetService: LockedAssetService,
        private readonly cacheService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    getProxyInfo(): ProxyModel[] {
        return [
            new ProxyModel({
                address: scAddress.proxyDexAddress.v1,
                version: 'v1',
            }),
            new ProxyModel({
                address: scAddress.proxyDexAddress.v2,
                version: 'v2',
            }),
        ];
    }

    getWrappedLpTokenAttributes(
        args: DecodeAttributesArgs,
    ): WrappedLpTokenAttributesModel[] {
        return args.batchAttributes.map((arg) =>
            this.decodeWrappedLpTokenAttributes(arg),
        );
    }

    getWrappedLpTokenAttributesV2(
        args: DecodeAttributesArgs,
    ): WrappedLpTokenAttributesModelV2[] {
        return args.batchAttributes.map((arg) =>
            this.decodeWrappedLpTokenAttributesV2(arg),
        );
    }

    decodeWrappedLpTokenAttributes(
        args: DecodeAttributesModel,
    ): WrappedLpTokenAttributesModel {
        const wrappedLpTokenAttributes =
            WrappedLpTokenAttributes.fromAttributes(args.attributes);

        return new WrappedLpTokenAttributesModel({
            ...wrappedLpTokenAttributes.toJSON(),
            attributes: args.attributes,
            identifier: args.identifier,
        });
    }

    decodeWrappedLpTokenAttributesV2(
        args: DecodeAttributesModel,
    ): WrappedLpTokenAttributesModelV2 {
        const wrappedLpTokenAttributes =
            WrappedLpTokenAttributesV2.fromAttributes(args.attributes);

        return new WrappedLpTokenAttributesModelV2({
            ...wrappedLpTokenAttributes.toJSON(),
            attributes: args.attributes,
            identifier: args.identifier,
        });
    }

    async getLockedAssetsAttributes(
        proxyAddress: string,
        lockedAssetTokenCollection: string,
        lockedAssetNonce: number,
    ): Promise<LockedAssetAttributesModel> {
        const nftIdentifier = tokenIdentifier(
            lockedAssetTokenCollection,
            lockedAssetNonce,
        );
        const nftAttributes =
            await this.apiService.getNftAttributesByTokenIdentifier(
                proxyAddress,
                nftIdentifier,
            );
        const lockedAssetAttributes =
            await this.lockedAssetService.decodeLockedAssetAttributes({
                batchAttributes: [
                    {
                        attributes: nftAttributes,
                        identifier: nftIdentifier,
                    },
                ],
            });

        return lockedAssetAttributes[0];
    }

    async getLockedTokenAttributes(
        proxyAddress: string,
        lockedTokenCollection: string,
        lockedTokenNonce: number,
    ): Promise<LockedTokenAttributesModel> {
        const cachedValue: LockedTokenAttributesModel =
            await this.cacheService.getCache(
                `${tokenIdentifier(
                    lockedTokenCollection,
                    lockedTokenNonce,
                )}.decodedAttributes`,
            );
        if (cachedValue && cachedValue !== undefined) {
            return new LockedTokenAttributesModel(cachedValue);
        }

        const nftIdentifier = tokenIdentifier(
            lockedTokenCollection,
            lockedTokenNonce,
        );
        const nftAttributes =
            await this.apiService.getNftAttributesByTokenIdentifier(
                proxyAddress,
                nftIdentifier,
            );

        return await this.cacheService.setCache(
            `${tokenIdentifier(
                lockedTokenCollection,
                lockedTokenNonce,
            )}.decodedAttributes`,
            new LockedTokenAttributesModel({
                ...LockedTokenAttributes.fromAttributes(nftAttributes),
                identifier: nftIdentifier,
                attributes: nftAttributes,
            }),
            CacheTtlInfo.Attributes.remoteTtl,
            CacheTtlInfo.Attributes.localTtl,
        );
    }

    getWrappedFarmTokenAttributes(
        args: DecodeAttributesArgs,
    ): WrappedFarmTokenAttributesModel[] {
        return args.batchAttributes.map((arg) =>
            this.decodeWrappedFarmTokenAttributes(arg),
        );
    }

    decodeWrappedFarmTokenAttributes(
        arg: DecodeAttributesModel,
    ): WrappedFarmTokenAttributesModel {
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

    getWrappedFarmTokenAttributesV2(
        args: DecodeAttributesArgs,
    ): WrappedFarmTokenAttributesModelV2[] {
        return args.batchAttributes.map((arg) =>
            this.decodeWrappedFarmTokenAttributesV2(arg),
        );
    }

    decodeWrappedFarmTokenAttributesV2(
        arg: DecodeAttributesModel,
    ): WrappedFarmTokenAttributesModelV2 {
        return new WrappedFarmTokenAttributesModelV2({
            ...WrappedFarmTokenAttributesV2.fromAttributes(
                arg.attributes,
            ).toJSON(),
            identifier: arg.identifier,
            attributes: arg.attributes,
        });
    }

    async getFarmTokenAttributes(
        proxyAddress: string,
        farmTokenCollection: string,
        farmTokenNonce: number,
    ): Promise<typeof FarmTokenAttributesUnion> {
        const farmAddress = await this.farmGetter.getFarmAddressByFarmTokenID(
            farmTokenCollection,
        );
        const version = farmVersion(farmAddress);

        const nftIdentifier = tokenIdentifier(
            farmTokenCollection,
            farmTokenNonce,
        );
        const cachedValue: LockedTokenAttributesModel =
            await this.cacheService.getCache(
                `${nftIdentifier}.decodedAttributes`,
            );
        if (cachedValue && cachedValue !== undefined) {
            switch (version) {
                case FarmVersion.V1_2:
                    return new FarmTokenAttributesModelV1_2(cachedValue);
                case FarmVersion.V1_3:
                    return new FarmTokenAttributesModelV1_3(cachedValue);
                case FarmVersion.V2:
                    return new FarmTokenAttributesModelV2(cachedValue);
            }
        }

        const nftAttributes =
            await this.apiService.getNftAttributesByTokenIdentifier(
                proxyAddress,
                nftIdentifier,
            );

        let decodedAttributes: typeof FarmTokenAttributesUnion;
        switch (version) {
            case FarmVersion.V1_2:
                decodedAttributes = new FarmTokenAttributesModelV1_2({
                    ...FarmTokenAttributesV1_2.fromAttributes(
                        nftAttributes,
                    ).toJSON(),
                    attributes: nftAttributes,
                    identifier: nftIdentifier,
                });
                break;
            case FarmVersion.V1_3:
                decodedAttributes = new FarmTokenAttributesModelV1_3({
                    ...FarmTokenAttributesV1_3.fromAttributes(
                        nftAttributes,
                    ).toJSON(),
                    attributes: nftAttributes,
                    identifier: nftIdentifier,
                });
                break;
            case FarmVersion.V2:
                decodedAttributes = new FarmTokenAttributesModelV2({
                    ...FarmTokenAttributesV2.fromAttributes(
                        nftAttributes,
                    ).toJSON(),
                    attributes: nftAttributes,
                    identifier: nftIdentifier,
                });
                break;
        }
        return await this.cacheService.setCache(
            `${nftIdentifier}.decodedAttributes`,
            decodedAttributes,
            CacheTtlInfo.Attributes.remoteTtl,
            CacheTtlInfo.Attributes.localTtl,
        );
    }

    async getProxyAddressByToken(tokenID: string): Promise<string> {
        let [lockedTokenIDs, proxyLpTokenID, proxyFarmTokenID] =
            await Promise.all([
                this.proxyGetter.getLockedAssetTokenID(
                    scAddress.proxyDexAddress.v1,
                ),
                this.proxyPairGetter.getwrappedLpTokenID(
                    scAddress.proxyDexAddress.v1,
                ),
                this.proxyFarmGetter.getwrappedFarmTokenID(
                    scAddress.proxyDexAddress.v1,
                ),
            ]);

        if (
            lockedTokenIDs.includes(tokenID) ||
            tokenID === proxyLpTokenID ||
            tokenID === proxyFarmTokenID
        ) {
            return scAddress.proxyDexAddress.v1;
        }

        [lockedTokenIDs, proxyLpTokenID, proxyFarmTokenID] = await Promise.all([
            await this.proxyGetterV2.getLockedAssetTokenID(
                scAddress.proxyDexAddress.v2,
            ),
            this.proxyPairGetter.getwrappedLpTokenID(
                scAddress.proxyDexAddress.v2,
            ),
            this.proxyFarmGetter.getwrappedFarmTokenID(
                scAddress.proxyDexAddress.v2,
            ),
        ]);

        if (
            lockedTokenIDs.includes(tokenID) ||
            tokenID === proxyLpTokenID ||
            tokenID === proxyFarmTokenID
        ) {
            return scAddress.proxyDexAddress.v2;
        }

        throw new Error('invalid locked token identifier');
    }
}
