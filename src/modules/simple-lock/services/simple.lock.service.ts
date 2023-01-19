import {
    LockedFarmTokenAttributes,
    LockedLpTokenAttributes,
    LockedTokenAttributes,
} from '@multiversx/sdk-exchange';
import { Inject, Injectable } from '@nestjs/common';
import { UserInputError } from 'apollo-server-express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
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
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { tokenIdentifier } from 'src/utils/token.converters';
import { Logger } from 'winston';
import {
    FarmProxyTokenAttributesModel,
    LockedTokenAttributesModel,
    LpProxyTokenAttributesModel,
    SimpleLockModel,
} from '../models/simple.lock.model';
import { SimpleLockGetterService } from './simple.lock.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { FarmFactoryService } from 'src/modules/farm/farm.factory';
import { FarmGetterFactory } from 'src/modules/farm/farm.getter.factory';
import { farmVersion } from 'src/utils/farm.utils';
import { FarmVersion } from 'src/modules/farm/models/farm.model';

@Injectable()
export class SimpleLockService {
    constructor(
        private readonly simpleLockGetter: SimpleLockGetterService,
        private readonly farmFactory: FarmFactoryService,
        private readonly farmGetterFactory: FarmGetterFactory,
        private readonly apiService: ElrondApiService,
        private readonly cacheService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    getSimpleLock(): SimpleLockModel[] {
        return scAddress.simpleLockAddress.map(
            (address: string) =>
                new SimpleLockModel({
                    address,
                }),
        );
    }

    async getLockedTokenAttributes(
        tokenID: string,
        tokenNonce: number,
    ): Promise<LockedTokenAttributesModel> {
        const simpleLockAddress = await this.getSimpleLockAddressByTokenID(
            tokenID,
        );
        const lockedEsdtCollection =
            await this.simpleLockGetter.getLockedTokenID(simpleLockAddress);
        const lockedTokenIdentifier = tokenIdentifier(
            lockedEsdtCollection,
            tokenNonce,
        );
        const cachedValue = await this.cacheService.getCache(
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
        return await this.cacheService.setCache(
            `${tokenID}.decodedAttributes`,
            decodedAttributes,
            CacheTtlInfo.Attributes.remoteTtl,
            CacheTtlInfo.Attributes.localTtl,
        );
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
        const lockedLpTokenCollection =
            await this.simpleLockGetter.getLpProxyTokenID(simpleLockAddress);
        const lockedLpTokenIdentifier = tokenIdentifier(
            lockedLpTokenCollection,
            tokenNonce,
        );

        const cachedValue = await this.cacheService.getCache(
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
        return await this.cacheService.setCache(
            `${lockedLpTokenIdentifier}.decodedAttributes`,
            decodedAttributes,
            CacheTtlInfo.Attributes.remoteTtl,
            CacheTtlInfo.Attributes.localTtl,
        );
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
        const farmAddress =
            await this.farmGetterFactory.getFarmAddressByFarmTokenID(
                farmTokenID,
            );
        const version = farmVersion(farmAddress);
        const farmTokenIdentifier = tokenIdentifier(
            farmTokenID,
            farmTokenNonce,
        );
        const cachedValue = await this.cacheService.getCache(
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
        return await this.cacheService.setCache(
            `${farmTokenIdentifier}.decodedAttributes`,
            decodedAttributes,
            CacheTtlInfo.Attributes.remoteTtl,
            CacheTtlInfo.Attributes.localTtl,
        );
    }

    async getSimpleLockAddressByTokenID(tokenID: string): Promise<string> {
        for (const address of scAddress.simpleLockAddress) {
            const [lockedTokenID, lockedLpTokenID, lockedFarmTokenID] =
                await Promise.all([
                    this.simpleLockGetter.getLockedTokenID(address),
                    this.simpleLockGetter.getLpProxyTokenID(address),
                    this.simpleLockGetter.getFarmProxyTokenID(address),
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
