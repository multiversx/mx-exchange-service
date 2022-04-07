import { BinaryCodec } from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { FarmTokenAttributesModel } from 'src/modules/farm/models/farmTokenAttributes.model';
import { FarmService } from 'src/modules/farm/services/farm.service';
import {
    DecodeAttributesArgs,
    DecodeAttributesModel,
} from 'src/modules/proxy/models/proxy.args';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { tokenIdentifier } from 'src/utils/token.converters';
import { Logger } from 'winston';
import {
    FarmProxyTokenAttributesModel,
    LockedTokenAttributesModel,
    LpProxyTokenAttributesModel,
    SimpleLockModel,
} from '../models/simple.lock.model';

@Injectable()
export class SimpleLockService {
    constructor(
        private readonly farmService: FarmService,
        private readonly apiService: ElrondApiService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    getSimpleLock() {
        return new SimpleLockModel({
            address: scAddress.simpleLockAddress,
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
        const attributesBuffer = Buffer.from(args.attributes, 'base64');
        const codec = new BinaryCodec();
        const structType = LockedTokenAttributesModel.getStructure();

        const [decodedAttributes] = codec.decodeNested(
            attributesBuffer,
            structType,
        );

        const lockedTokenAttributes = LockedTokenAttributesModel.fromDecodedAttributes(
            decodedAttributes.valueOf(),
        );
        lockedTokenAttributes.identifier = args.identifier;
        lockedTokenAttributes.attributes = args.attributes;
        return lockedTokenAttributes;
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
        const attributesBuffer = Buffer.from(args.attributes, 'base64');
        const codec = new BinaryCodec();
        const structType = LpProxyTokenAttributesModel.getStructure();

        const [decodedAttributes] = codec.decodeNested(
            attributesBuffer,
            structType,
        );

        const lpProxyTokenAttributes = LpProxyTokenAttributesModel.fromDecodedAttributes(
            decodedAttributes.valueOf(),
        );
        lpProxyTokenAttributes.identifier = args.identifier;
        lpProxyTokenAttributes.attributes = args.attributes;
        return lpProxyTokenAttributes;
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

    async decodeFarmProxyTokenAttributes(
        args: DecodeAttributesModel,
    ): Promise<FarmProxyTokenAttributesModel> {
        const attributesBuffer = Buffer.from(args.attributes, 'base64');
        const codec = new BinaryCodec();
        const structType = FarmProxyTokenAttributesModel.getStructure();

        const [decodedAttributes] = codec.decodeNested(
            attributesBuffer,
            structType,
        );

        const farmProxyTokenAttributes = FarmProxyTokenAttributesModel.fromDecodedAttributes(
            decodedAttributes.valueOf(),
        );
        farmProxyTokenAttributes.identifier = args.identifier;
        farmProxyTokenAttributes.attributes = args.attributes;

        const farmTokenIdentifier = tokenIdentifier(
            farmProxyTokenAttributes.farmTokenID,
            farmProxyTokenAttributes.farmTokenNonce,
        );
        const [farmToken, farmAddress] = await Promise.all([
            this.apiService.getNftByTokenIdentifier(
                scAddress.simpleLockAddress,
                farmTokenIdentifier,
            ),
            this.farmService.getFarmAddressByFarmTokenID(
                farmProxyTokenAttributes.farmTokenID,
            ),
        ]);

        const farmTokenAttributes: FarmTokenAttributesModel = this.farmService.decodeFarmTokenAttributes(
            farmAddress,
            farmTokenIdentifier,
            farmToken.attributes,
        );
        farmProxyTokenAttributes.farmTokenAttributes = farmTokenAttributes;
        return farmProxyTokenAttributes;
    }
}
