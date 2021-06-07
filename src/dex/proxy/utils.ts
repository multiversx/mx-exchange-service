import {
    AbiRegistry,
    Address,
    BigUIntType,
    BinaryCodec,
    SmartContract,
    SmartContractAbi,
    StructFieldDefinition,
    StructType,
    TokenIdentifierType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { abiConfig, scAddress } from 'src/config';

export async function getContract() {
    const abiRegistry = await AbiRegistry.load({
        files: [abiConfig.proxy],
    });
    const abi = new SmartContractAbi(abiRegistry, ['ProxyDexImpl']);
    const contract = new SmartContract({
        address: new Address(scAddress.proxyDexAddress),
        abi: abi,
    });

    return contract;
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
        new StructFieldDefinition(
            'farmedTokenID',
            '',
            new TokenIdentifierType(),
        ),
        new StructFieldDefinition('farmedTokenNonce', '', new U64Type()),
    ]);

    const [decoded, decodedLength] = codec.decodeNested(
        attributesBuffer,
        structType,
    );

    return decoded.valueOf();
}
