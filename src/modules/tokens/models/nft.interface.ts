import { Field, Int, InterfaceType } from '@nestjs/graphql';
import { IAssets } from './assets.interface';
import { IRoles } from './roles.interface';

@InterfaceType()
export abstract class INFTCollection {
    @Field({ complexity: 0 }) collection: string;
    @Field({ complexity: 0 }) name: string;
    @Field({ complexity: 0 }) ticker: string;
    @Field(() => Int, { complexity: 0 }) decimals: number;
    @Field({ complexity: 0 }) issuer: string;
    @Field({ complexity: 0 }) timestamp: number;
    @Field({ complexity: 0 }) canUpgrade: boolean;
    @Field({ complexity: 0 }) canMint: boolean;
    @Field({ complexity: 0 }) canBurn: boolean;
    @Field({ complexity: 0 }) canChangeOwner: boolean;
    @Field({ complexity: 0 }) canPause: boolean;
    @Field({ complexity: 0 }) canFreeze: boolean;
    @Field({ complexity: 0 }) canWipe: boolean;
    @Field({ complexity: 0 }) canAddSpecialRoles: boolean;
    @Field({ complexity: 0 }) canTransferNFTCreateRole: boolean;
    @Field({ complexity: 0 }) NFTCreateStopped: boolean;
    @Field(() => IAssets, { nullable: true })
    assets?: IAssets;
    @Field(() => IRoles, { nullable: true })
    roles?: IRoles;
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
