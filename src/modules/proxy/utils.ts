import { BinaryCodec } from '@elrondnetwork/erdjs/out';
import { WrappedFarmTokenAttributesModel } from './models/wrappedFarmTokenAttributes.model';
import { WrappedLpTokenAttributesModel } from './models/wrappedLpTokenAttributes.model';

function decimalToHex(d: number): string {
    const h = d.toString(16);
    return h.length % 2 ? '0' + h : h;
}

export function decodeWrappedLPTokenAttributes(attributes: string) {
    const attributesBuffer = Buffer.from(attributes, 'base64');
    const codec = new BinaryCodec();
    const structType = WrappedLpTokenAttributesModel.getStructure();

    const [decoded, decodedLength] = codec.decodeNested(
        attributesBuffer,
        structType,
    );

    return decoded.valueOf();
}

export function decodeWrappedFarmTokenAttributes(attributes: string) {
    const attributesBuffer = Buffer.from(attributes, 'base64');
    const codec = new BinaryCodec();
    const structType = WrappedFarmTokenAttributesModel.getStructure();

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
