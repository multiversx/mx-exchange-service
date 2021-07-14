import {
    BigUIntType,
    BinaryCodec,
    StructFieldDefinition,
    StructType,
    TokenIdentifierType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { WrappedFarmTokenAttributesModel } from '../../models/proxy.model';

function decimalToHex(d: number): string {
    const h = d.toString(16);
    return h.length % 2 ? '0' + h : h;
}

export function decodeWrappedLPTokenAttributes(attributes: string) {
    const attributesBuffer = Buffer.from(attributes, 'base64');
    const codec = new BinaryCodec();
    const structType = new StructType('WrappedLpTokenAttributes', [
        new StructFieldDefinition('lpTokenID', '', new TokenIdentifierType()),
        new StructFieldDefinition('lpTokenTotalAmount', '', new BigUIntType()),
        new StructFieldDefinition(
            'lockedAssetsInvested',
            '',
            new BigUIntType(),
        ),
        new StructFieldDefinition('lockedAssetsNonce', '', new U64Type()),
    ]);

    const [decoded, decodedLength] = codec.decodeNested(
        attributesBuffer,
        structType,
    );

    return decoded.valueOf();
}

export function decodeWrappedFarmTokenAttributes(attributes: string) {
    const attributesBuffer = Buffer.from(attributes, 'base64');
    const codec = new BinaryCodec();
    const structType = new StructType('WrappedFarmTokenAttributes', [
        new StructFieldDefinition('farmTokenID', '', new TokenIdentifierType()),
        new StructFieldDefinition('farmTokenNonce', '', new U64Type()),
        new StructFieldDefinition('farmTokenAmount', '', new BigUIntType()),
        new StructFieldDefinition(
            'farmingTokenID',
            '',
            new TokenIdentifierType(),
        ),
        new StructFieldDefinition('farmingTokenNonce', '', new U64Type()),
        new StructFieldDefinition('farmingTokenAmount', '', new BigUIntType()),
    ]);

    const [decoded, decodedLength] = codec.decodeNested(
        attributesBuffer,
        structType,
    );
    const decodedAttributes: WrappedFarmTokenAttributesModel = decoded.valueOf();
    const farmTokenIdentifier = `${
        decodedAttributes.farmTokenID
    }-${decimalToHex(decodedAttributes.farmTokenNonce)}`;

    return {
        ...decodedAttributes,
        farmTokenIdentifier: farmTokenIdentifier,
    };
}
