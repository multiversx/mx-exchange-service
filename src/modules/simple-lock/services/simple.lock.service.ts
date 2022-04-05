import { BinaryCodec } from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import {
    DecodeAttributesArgs,
    DecodeAttributesModel,
} from 'src/modules/proxy/models/proxy.args';
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

    decodeBatchFarmProxyTokenAttributes(
        args: DecodeAttributesArgs,
    ): FarmProxyTokenAttributesModel[] {
        return args.batchAttributes.map(arg => {
            return this.decodeFarmProxyTokenAttributes(arg);
        });
    }

    decodeFarmProxyTokenAttributes(
        args: DecodeAttributesModel,
    ): FarmProxyTokenAttributesModel {
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
        return farmProxyTokenAttributes;
    }
}
