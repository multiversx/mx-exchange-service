import {
    BigUIntType,
    StructFieldDefinition,
    StructType,
    TokenIdentifierType,
    U64Type,
} from '@elrondnetwork/erdjs/out';

export const FftTokenAmountPairStruct = (): StructType => {
    return new StructType('FftTokenAmountPair', [
        new StructFieldDefinition('tokenID', '', new TokenIdentifierType()),
        new StructFieldDefinition('amount', '', new BigUIntType()),
    ]);
};

export const GenericTokenAmountPairStruct = (): StructType => {
    return new StructType('GenericTokenAmountPair', [
        new StructFieldDefinition('tokenID', '', new TokenIdentifierType()),
        new StructFieldDefinition('tokenNonce', '', new U64Type()),
        new StructFieldDefinition('amount', '', new BigUIntType()),
    ]);
};
