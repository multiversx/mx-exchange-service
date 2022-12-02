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
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import {
    FarmTokenAttributesV1_2,
    FarmTokenAttributesV1_3,
    FarmTokenAttributesV2,
    LockedTokenAttributes,
    WrappedFarmTokenAttributes,
    WrappedFarmTokenAttributesV2,
    WrappedLpTokenAttributes,
    WrappedLpTokenAttributesV2,
} from '@elrondnetwork/erdjs-dex';
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
        private readonly apiService: ElrondApiService,
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

    async getWrappedLpTokenAttributes(
        args: DecodeAttributesArgs,
    ): Promise<WrappedLpTokenAttributesModel[]> {
        const promises = args.batchAttributes.map((arg) =>
            this.decodeWrappedLpTokenAttributes(arg),
        );

        return await Promise.all(promises);
    }

    async getWrappedLpTokenAttributesV2(
        args: DecodeAttributesArgs,
    ): Promise<WrappedLpTokenAttributesModelV2[]> {
        const promises = args.batchAttributes.map((arg) =>
            this.decodeWrappedLpTokenAttributesV2(arg),
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
        const cachedValue: LockedAssetAttributesModel =
            await this.cacheService.getCache(
                `${tokenIdentifier(
                    lockedAssetTokenCollection,
                    lockedAssetNonce,
                )}.decodedAttributes`,
            );
        if (cachedValue && cachedValue !== undefined) {
            return new LockedAssetAttributesModel(cachedValue);
        }
        const lockedAssetToken = await this.apiService.getNftByTokenIdentifier(
            proxyAddress,
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

        return await this.cacheService.setCache(
            `${tokenIdentifier(
                lockedAssetTokenCollection,
                lockedAssetNonce,
            )}.decodedAttributes`,
            lockedAssetAttributes[0],
            CacheTtlInfo.Attributes.remoteTtl,
            CacheTtlInfo.Attributes.localTtl,
        );
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
        const lockedToken = await this.apiService.getNftByTokenIdentifier(
            proxyAddress,
            tokenIdentifier(lockedTokenCollection, lockedTokenNonce),
        );

        return await this.cacheService.setCache(
            `${tokenIdentifier(
                lockedTokenCollection,
                lockedTokenNonce,
            )}.decodedAttributes`,
            new LockedTokenAttributesModel({
                ...LockedTokenAttributes.fromAttributes(lockedToken.attributes),
                identifier: lockedToken.identifier,
                attributes: lockedToken.attributes,
            }),
            CacheTtlInfo.Attributes.remoteTtl,
            CacheTtlInfo.Attributes.localTtl,
        );
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
        const farmToken = await this.apiService.getNftByTokenIdentifier(
            proxyAddress,
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
            case FarmVersion.V2:
                return new FarmTokenAttributesModelV2({
                    ...FarmTokenAttributesV2.fromAttributes(
                        farmToken.attributes,
                    ).toJSON(),
                    attributes: farmToken.attributes,
                    identifier: farmToken.identifier,
                });
        }
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
