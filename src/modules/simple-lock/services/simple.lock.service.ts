import {
    LockedFarmTokenAttributes,
    LockedLpTokenAttributes,
    LockedTokenAttributes,
} from '@multiversx/sdk-exchange';
import { Injectable } from '@nestjs/common';
import { UserInputError } from '@nestjs/apollo';
import { scAddress } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import {
    FarmTokenAttributesModelV1_3,
    FarmTokenAttributesModelV2,
    FarmTokenAttributesUnion,
} from 'src/modules/farm/models/farmTokenAttributes.model';
import {
    DecodeAttributesArgs,
    DecodeAttributesModel,
} from 'src/modules/proxy/models/proxy.args';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { tokenIdentifier } from 'src/utils/token.converters';
import {
    FarmProxyTokenAttributesModel,
    LockedTokenAttributesModel,
    LpProxyTokenAttributesModel,
} from '../models/simple.lock.model';
import { CacheService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { FarmFactoryService } from 'src/modules/farm/farm.factory';
import { farmVersion } from 'src/utils/farm.utils';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { SimpleLockAbiService } from './simple.lock.abi.service';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { FarmAbiFactory } from 'src/modules/farm/farm.abi.factory';
import { TokenService } from 'src/modules/tokens/services/token.service';

@Injectable()
export class SimpleLockService {
    constructor(
        private readonly simpleLockAbi: SimpleLockAbiService,
        private readonly farmFactory: FarmFactoryService,
        private readonly farmAbi: FarmAbiFactory,
        private readonly tokenService: TokenService,
        private readonly apiService: MXApiService,
        private readonly cacheService: CacheService,
    ) {}

    async getLockedToken(simpleLockAddress: string): Promise<NftCollection> {
        const tokenID = await this.simpleLockAbi.lockedTokenID(
            simpleLockAddress,
        );
        return this.tokenService.getNftCollectionMetadata(tokenID);
    }

    async getLpProxyToken(simpleLockAddress: string): Promise<NftCollection> {
        const tokenID = await this.simpleLockAbi.lpProxyTokenID(
            simpleLockAddress,
        );
        return this.tokenService.getNftCollectionMetadata(tokenID);
    }

    async getFarmProxyToken(simpleLockAddress: string): Promise<NftCollection> {
        const tokenID = await this.simpleLockAbi.farmProxyTokenID(
            simpleLockAddress,
        );
        return this.tokenService.getNftCollectionMetadata(tokenID);
    }

    async getLockedTokenAttributes(
        tokenID: string,
        tokenNonce: number,
    ): Promise<LockedTokenAttributesModel> {
        const simpleLockAddress = await this.getSimpleLockAddressByTokenID(
            tokenID,
        );
        const lockedEsdtCollection = await this.simpleLockAbi.lockedTokenID(
            simpleLockAddress,
        );
        const lockedTokenIdentifier = tokenIdentifier(
            lockedEsdtCollection,
            tokenNonce,
        );
        const cachedValue = await this.cacheService.get(
            `${lockedTokenIdentifier}.decodedAttributes`,
        );
        if (cachedValue && cachedValue !== undefined) {
            return new LockedTokenAttributesModel(cachedValue);
        }
        const lockedTokenAttributes =
            await this.apiService.getNftAttributesByTokenIdentifier(
                simpleLockAddress,
                lockedTokenIdentifier,
            );
        const decodedAttributes = this.decodeLockedTokenAttributes({
            identifier: lockedTokenIdentifier,
            attributes: lockedTokenAttributes,
        });
        await this.cacheService.set(
            `${tokenID}.decodedAttributes`,
            decodedAttributes,
            CacheTtlInfo.Attributes.remoteTtl,
            CacheTtlInfo.Attributes.localTtl,
        );
        return decodedAttributes;
    }

    decodeBatchLockedTokenAttributes(
        args: DecodeAttributesArgs,
    ): LockedTokenAttributesModel[] {
        return args.batchAttributes.map((arg) => {
            return this.decodeLockedTokenAttributes(arg);
        });
    }

    decodeLockedTokenAttributes(
        args: DecodeAttributesModel,
    ): LockedTokenAttributesModel {
        return new LockedTokenAttributesModel({
            ...LockedTokenAttributes.fromAttributes(args.attributes).toJSON(),
            attributes: args.attributes,
            identifier: args.identifier,
        });
    }

    async getLpTokenProxyAttributes(
        lockedLpTokenID: string,
        tokenNonce: number,
    ): Promise<LpProxyTokenAttributesModel> {
        const simpleLockAddress = await this.getSimpleLockAddressByTokenID(
            lockedLpTokenID,
        );
        const lockedLpTokenCollection = await this.simpleLockAbi.lpProxyTokenID(
            simpleLockAddress,
        );
        const lockedLpTokenIdentifier = tokenIdentifier(
            lockedLpTokenCollection,
            tokenNonce,
        );

        const cachedValue = await this.cacheService.get(
            `${lockedLpTokenIdentifier}.decodedAttributes`,
        );
        if (cachedValue && cachedValue !== undefined) {
            return new LpProxyTokenAttributesModel(cachedValue);
        }

        const lockedLpTokenAttributes =
            await this.apiService.getNftAttributesByTokenIdentifier(
                simpleLockAddress,
                lockedLpTokenIdentifier,
            );

        const decodedAttributes = this.decodeLpProxyTokenAttributes({
            identifier: lockedLpTokenIdentifier,
            attributes: lockedLpTokenAttributes,
        });
        await this.cacheService.set(
            `${lockedLpTokenIdentifier}.decodedAttributes`,
            decodedAttributes,
            CacheTtlInfo.Attributes.remoteTtl,
            CacheTtlInfo.Attributes.localTtl,
        );
        return decodedAttributes;
    }

    decodeBatchLpTokenProxyAttributes(
        args: DecodeAttributesArgs,
    ): LpProxyTokenAttributesModel[] {
        return args.batchAttributes.map((arg) => {
            return this.decodeLpProxyTokenAttributes(arg);
        });
    }

    decodeLpProxyTokenAttributes(
        args: DecodeAttributesModel,
    ): LpProxyTokenAttributesModel {
        return new LpProxyTokenAttributesModel({
            ...LockedLpTokenAttributes.fromAttributes(args.attributes).toJSON(),
            attributes: args.attributes,
            identifier: args.identifier,
        });
    }

    decodeBatchFarmProxyTokenAttributes(
        args: DecodeAttributesArgs,
    ): FarmProxyTokenAttributesModel[] {
        const decodedBatchAttributes: FarmProxyTokenAttributesModel[] = [];
        for (const arg of args.batchAttributes) {
            decodedBatchAttributes.push(
                this.decodeFarmProxyTokenAttributes(arg),
            );
        }
        return decodedBatchAttributes;
    }

    decodeFarmProxyTokenAttributes(
        args: DecodeAttributesModel,
    ): FarmProxyTokenAttributesModel {
        const lockedFarmTokenAttributesModel =
            new FarmProxyTokenAttributesModel({
                ...LockedFarmTokenAttributes.fromAttributes(args.attributes),
                attributes: args.attributes,
                identifier: args.identifier,
            });

        return lockedFarmTokenAttributesModel;
    }

    async getFarmTokenAttributes(
        farmTokenID: string,
        farmTokenNonce: number,
        simpleLockAddress: string,
    ): Promise<typeof FarmTokenAttributesUnion> {
        const farmAddress = await this.farmAbi.getFarmAddressByFarmTokenID(
            farmTokenID,
        );
        const version = farmVersion(farmAddress);
        const farmTokenIdentifier = tokenIdentifier(
            farmTokenID,
            farmTokenNonce,
        );
        const cachedValue = await this.cacheService.get(
            `${farmTokenIdentifier}.decodedAttributes`,
        );
        if (cachedValue && cachedValue !== undefined) {
            return version === FarmVersion.V1_3
                ? new FarmTokenAttributesModelV1_3(cachedValue)
                : new FarmTokenAttributesModelV2(cachedValue);
        }

        const farmTokenAttributes =
            await this.apiService.getNftAttributesByTokenIdentifier(
                simpleLockAddress,
                farmTokenIdentifier,
            );

        const decodedAttributes = this.farmFactory
            .useService(farmAddress)
            .decodeFarmTokenAttributes(
                farmTokenIdentifier,
                farmTokenAttributes,
            );
        await this.cacheService.set(
            `${farmTokenIdentifier}.decodedAttributes`,
            decodedAttributes,
            CacheTtlInfo.Attributes.remoteTtl,
            CacheTtlInfo.Attributes.localTtl,
        );
        return decodedAttributes;
    }

    async getSimpleLockAddressByTokenID(tokenID: string): Promise<string> {
        for (const address of scAddress.simpleLockAddress) {
            const [lockedTokenID, lockedLpTokenID, lockedFarmTokenID] =
                await Promise.all([
                    this.simpleLockAbi.lockedTokenID(address),
                    this.simpleLockAbi.lpProxyTokenID(address),
                    this.simpleLockAbi.farmProxyTokenID(address),
                ]);

            if (
                tokenID === lockedTokenID ||
                tokenID === lockedLpTokenID ||
                tokenID === lockedFarmTokenID
            ) {
                return address;
            }
        }
    }

    async getSimpleLockAddressFromInputTokens(
        inputTokens: InputTokenModel[],
    ): Promise<string> {
        let simpleLockAddress: string;
        for (const token of inputTokens) {
            if (token.nonce === 0) {
                continue;
            }
            const address = await this.getSimpleLockAddressByTokenID(
                token.tokenID,
            );
            if (address && !simpleLockAddress) {
                simpleLockAddress = address;
            } else if (address && address !== simpleLockAddress) {
                throw new UserInputError('Input tokens not from contract');
            }
        }

        if (simpleLockAddress === undefined) {
            throw new UserInputError('Invalid input tokens');
        }

        return simpleLockAddress;
    }
}
