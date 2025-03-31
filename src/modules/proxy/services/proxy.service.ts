import { Injectable } from '@nestjs/common';
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
import { LockedTokenAttributesModel } from 'src/modules/simple-lock/models/simple.lock.model';
import { CacheService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { ProxyAbiService } from './proxy.abi.service';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { ProxyAbiServiceV2 } from '../v2/services/proxy.v2.abi.service';
import { ProxyPairAbiService } from './proxy-pair/proxy.pair.abi.service';
import { ProxyFarmAbiService } from './proxy-farm/proxy.farm.abi.service';
import { proxyVersion } from 'src/utils/proxy.utils';
import { FarmAbiFactory } from 'src/modules/farm/farm.abi.factory';
import { TokenService } from 'src/modules/tokens/services/token.service';

@Injectable()
export class ProxyService {
    constructor(
        private readonly proxyAbi: ProxyAbiService,
        private readonly proxyAbiV2: ProxyAbiServiceV2,
        private readonly proxyPairAbi: ProxyPairAbiService,
        private readonly proxyFarmAbi: ProxyFarmAbiService,
        private readonly farmAbi: FarmAbiFactory,
        private readonly apiService: MXApiService,
        private readonly lockedAssetService: LockedAssetService,
        private readonly cacheService: CacheService,
        private readonly tokenService: TokenService,
    ) {}

    async getAssetToken(proxyAddress: string): Promise<EsdtToken> {
        const assetTokenID = await this.proxyAbi.assetTokenID(proxyAddress);
        return this.tokenService.tokenMetadata(assetTokenID);
    }

    async getlockedAssetToken(proxyAddress: string): Promise<NftCollection[]> {
        const version = proxyVersion(proxyAddress);
        const lockedAssetTokenIDs =
            version === 'v1'
                ? await this.proxyAbi.lockedAssetTokenID(proxyAddress)
                : await this.proxyAbiV2.lockedAssetTokenID(proxyAddress);
        return Promise.all(
            lockedAssetTokenIDs.map((tokenID: string) =>
                this.tokenService.getNftCollectionMetadata(tokenID),
            ),
        );
    }

    async getwrappedLpToken(proxyAddress: string): Promise<NftCollection> {
        const wrappedLpTokenID = await this.proxyPairAbi.wrappedLpTokenID(
            proxyAddress,
        );
        return this.tokenService.getNftCollectionMetadata(wrappedLpTokenID);
    }

    async getwrappedFarmToken(proxyAddress: string): Promise<NftCollection> {
        const wrappedFarmTokenID = await this.proxyFarmAbi.wrappedFarmTokenID(
            proxyAddress,
        );
        return this.tokenService.getNftCollectionMetadata(wrappedFarmTokenID);
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
            await this.cacheService.get(
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

        const value = new LockedTokenAttributesModel({
            ...LockedTokenAttributes.fromAttributes(nftAttributes),
            identifier: nftIdentifier,
            attributes: nftAttributes,
        });
        await this.cacheService.set(
            `${tokenIdentifier(
                lockedTokenCollection,
                lockedTokenNonce,
            )}.decodedAttributes`,
            value,
            CacheTtlInfo.Attributes.remoteTtl,
            CacheTtlInfo.Attributes.localTtl,
        );
        return value;
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
        const farmAddress = await this.farmAbi.getFarmAddressByFarmTokenID(
            farmTokenCollection,
        );
        const version = farmVersion(farmAddress);

        const nftIdentifier = tokenIdentifier(
            farmTokenCollection,
            farmTokenNonce,
        );
        const cachedValue: LockedTokenAttributesModel =
            await this.cacheService.get(`${nftIdentifier}.decodedAttributes`);
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

        await this.cacheService.set(
            `${nftIdentifier}.decodedAttributes`,
            decodedAttributes,
            CacheTtlInfo.Attributes.remoteTtl,
            CacheTtlInfo.Attributes.localTtl,
        );
        return decodedAttributes;
    }

    async getProxyAddressByToken(tokenID: string): Promise<string> {
        let [lockedTokenIDs, proxyLpTokenID, proxyFarmTokenID] =
            await Promise.all([
                this.proxyAbi.lockedAssetTokenID(scAddress.proxyDexAddress.v1),
                this.proxyPairAbi.wrappedLpTokenID(
                    scAddress.proxyDexAddress.v1,
                ),
                this.proxyFarmAbi.wrappedFarmTokenID(
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
            await this.proxyAbiV2.lockedAssetTokenID(
                scAddress.proxyDexAddress.v2,
            ),
            this.proxyPairAbi.wrappedLpTokenID(scAddress.proxyDexAddress.v2),
            this.proxyFarmAbi.wrappedFarmTokenID(scAddress.proxyDexAddress.v2),
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
