import {
    LockedFarmTokenAttributes,
    LockedLpTokenAttributes,
    LockedTokenAttributes,
} from '@elrondnetwork/erdjs-dex';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { FarmTokenAttributesModel } from 'src/modules/farm/models/farmTokenAttributes.model';
import { FarmService } from 'src/modules/farm/services/farm.service';
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

@Injectable()
export class SimpleLockService {
    constructor(
        private readonly simpleLockGetter: SimpleLockGetterService,
        private readonly farmService: FarmService,
        private readonly apiService: ElrondApiService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    getSimpleLock() {
        return new SimpleLockModel({
            address: scAddress.simpleLockAddress,
        });
    }

    async getLockedTokenAttributes(
        tokenNonce: number,
    ): Promise<LockedTokenAttributesModel> {
        const lockedEsdtCollection = await this.simpleLockGetter.getLockedTokenID();
        const lockedTokenIdentifier = tokenIdentifier(
            lockedEsdtCollection,
            tokenNonce,
        );
        const lockedToken = await this.apiService.getNftByTokenIdentifier(
            scAddress.simpleLockAddress,
            lockedTokenIdentifier,
        );
        return this.decodeLockedTokenAttributes({
            identifier: lockedTokenIdentifier,
            attributes: lockedToken.attributes,
        });
    }

    decodeBatchLockedTokenAttributes(
        args: DecodeAttributesArgs,
    ): LockedTokenAttributesModel[] {
        return args.batchAttributes.map(arg => {
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
        tokenNonce: number,
    ): Promise<LpProxyTokenAttributesModel> {
        const lockedLpTokenCollection = await this.simpleLockGetter.getLpProxyTokenID();
        const lockedLpTokenIdentifier = tokenIdentifier(
            lockedLpTokenCollection,
            tokenNonce,
        );
        const lockedLpToken = await this.apiService.getNftByTokenIdentifier(
            scAddress.simpleLockAddress,
            lockedLpTokenIdentifier,
        );

        return this.decodeLpProxyTokenAttributes({
            identifier: lockedLpTokenIdentifier,
            attributes: lockedLpToken.attributes,
        });
    }

    decodeBatchLpTokenProxyAttributes(
        args: DecodeAttributesArgs,
    ): LpProxyTokenAttributesModel[] {
        return args.batchAttributes.map(arg => {
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

    async decodeBatchFarmProxyTokenAttributes(
        args: DecodeAttributesArgs,
    ): Promise<FarmProxyTokenAttributesModel[]> {
        const decodedBatchAttributes: FarmProxyTokenAttributesModel[] = [];
        for (const arg of args.batchAttributes) {
            decodedBatchAttributes.push(
                await this.decodeFarmProxyTokenAttributes(arg),
            );
        }
        return decodedBatchAttributes;
    }

    decodeFarmProxyTokenAttributes(
        args: DecodeAttributesModel,
    ): FarmProxyTokenAttributesModel {
        const lockedFarmTokenAttributesModel = new FarmProxyTokenAttributesModel(
            {
                ...LockedFarmTokenAttributes.fromAttributes(args.attributes),
                attributes: args.attributes,
                identifier: args.identifier,
            },
        );

        return lockedFarmTokenAttributesModel;
    }

    async getFarmTokenAttributes(
        farmTokenID: string,
        farmTokenNonce: number,
    ): Promise<FarmTokenAttributesModel> {
        const farmTokenIdentifier = tokenIdentifier(
            farmTokenID,
            farmTokenNonce,
        );
        const [farmToken, farmAddress] = await Promise.all([
            this.apiService.getNftByTokenIdentifier(
                scAddress.simpleLockAddress,
                farmTokenIdentifier,
            ),
            this.farmService.getFarmAddressByFarmTokenID(farmTokenID),
        ]);

        return this.farmService.decodeFarmTokenAttributes(
            farmAddress,
            farmTokenIdentifier,
            farmToken.attributes,
        );
    }
}
