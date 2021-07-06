import { Field, InterfaceType } from '@nestjs/graphql';

@InterfaceType()
export abstract class NftCollection {
    @Field() collection: string;
    @Field() name: string;
    @Field() ticker: string;
    @Field() issuer: string;
    @Field() timestamp: number;
    @Field() canUpgrade: boolean;
    @Field() canMint: boolean;
    @Field() canBurn: boolean;
    @Field() canChangeOwner: boolean;
    @Field() canPause: boolean;
    @Field() canFreeze: boolean;
    @Field() canWipe: boolean;
    @Field() canAddSpecialRoles: boolean;
    @Field() canTransferNFTCreateRole: boolean;
    @Field() NFTCreateStopped: boolean;
}
