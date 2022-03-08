import { BinaryCodec } from '@elrondnetwork/erdjs/out';
import { decimalToHex } from 'src/utils/token.converters';
import { WrappedFarmTokenAttributesModel } from './models/wrappedFarmTokenAttributes.model';
import { WrappedLpTokenAttributesModel } from './models/wrappedLpTokenAttributes.model';

export function decodeWrappedLPTokenAttributes(attributes: string) {
    const attributesBuffer = Buffer.from(attributes, 'base64');
    const codec = new BinaryCodec();
    const structType = WrappedLpTokenAttributesModel.getStructure();

    const [decoded] = codec.decodeNested(attributesBuffer, structType);

    return decoded.valueOf();
}

export function decodeWrappedFarmTokenAttributes(attributes: string) {
    const attributesBuffer = Buffer.from(attributes, 'base64');
    const codec = new BinaryCodec();
    const structType = WrappedFarmTokenAttributesModel.getStructure();

    const [decoded] = codec.decodeNested(attributesBuffer, structType);
    const decodedAttributes: WrappedFarmTokenAttributesModel = decoded.valueOf();
    const farmTokenIdentifier = `${
        decodedAttributes.farmTokenID
    }-${decimalToHex(decodedAttributes.farmTokenNonce)}`;

    return {
        ...decodedAttributes,
        farmTokenIdentifier: farmTokenIdentifier,
    };
}
