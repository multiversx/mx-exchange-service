import { Field, Int, InterfaceType } from '@nestjs/graphql';
import { IAssets } from './assets.interface';
import { IRoles } from './roles.interface';

@InterfaceType()
export abstract class INFTCollection {
    @Field() collection: string;
    @Field() name: string;
    @Field() ticker: string;
    @Field(() => Int) decimals: number;
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
    @Field(() => IAssets, { nullable: true }) assets?: IAssets;
    @Field(() => IRoles, { nullable: true }) roles?: IRoles;
}

@InterfaceType()
export abstract class INFTToken {
    @Field() identifier: string;
    @Field() collection: string;
    @Field() ticker: string;
    @Field(() => Int) decimals: number;
    @Field(() => Int, { nullable: true }) timestamp?: number;
    @Field() attributes: string;
    @Field(() => Int) nonce: number;
    @Field() type: string;
    @Field() name: string;
    @Field() creator: string;
    @Field(() => Int, { nullable: true }) royalties?: number;
    @Field(() => [String], { nullable: true }) uris?: string[];
    @Field({ nullable: true }) url?: string;
    @Field(() => [String], { nullable: true }) tags?: string[];
    @Field() balance: string;
    @Field(() => IAssets, { nullable: true }) assets?: IAssets;
}
