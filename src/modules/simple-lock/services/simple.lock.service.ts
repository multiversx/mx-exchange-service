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
    LockedTokenAttributesModel,
    LpProxyTokenAttributes,
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

        return LockedTokenAttributesModel.fromDecodedAttributes(
            decodedAttributes,
        );
    }

    decodeBatchLpTokenProxyAttributes(
        args: DecodeAttributesArgs,
    ): LpProxyTokenAttributes[] {
        return args.batchAttributes.map(arg => {
            return this.decodeLpProxyTokenAttributes(arg);
        });
    }

    decodeLpProxyTokenAttributes(
        args: DecodeAttributesModel,
    ): LpProxyTokenAttributes {
        const attributesBuffer = Buffer.from(args.attributes, 'base64');
        const codec = new BinaryCodec();
        const structType = LpProxyTokenAttributes.getStructure();

        const [decodedAttributes] = codec.decodeNested(
            attributesBuffer,
            structType,
        );

        return LpProxyTokenAttributes.fromDecodedAttributes(decodedAttributes);
    }
}
