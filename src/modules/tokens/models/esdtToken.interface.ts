import { Field, Int, InterfaceType } from '@nestjs/graphql';
import { IAssets } from './assets.interface';
import { IRoles } from './roles.interface';

@InterfaceType()
export abstract class IEsdtToken {
    @Field({ complexity: 0 }) identifier: string;
    @Field({ complexity: 0 }) name: string;
    @Field({ complexity: 0 }) ticker: string;
    @Field({ complexity: 0 }) owner: string;
    @Field({ nullable: true, complexity: 0 }) minted?: string;
    @Field({ nullable: true, complexity: 0 }) burnt?: string;
    @Field({ nullable: true, complexity: 0 }) initialMinted?: string;
    @Field({ complexity: 0 }) decimals: number;
    @Field({ nullable: true }) price?: string;
    @Field({ nullable: true, complexity: 0 }) supply?: string;
    @Field({ nullable: true, complexity: 0 }) circulatingSupply?: string;
    @Field(() => IAssets, { nullable: true })
    assets?: IAssets;
    @Field(() => Int, { complexity: 0 }) transactions: number;
    @Field(() => Int, { defaultValue: 0, complexity: 0 }) accounts: number;
    @Field({ complexity: 0 }) isPaused: boolean;
    @Field({ complexity: 0 }) canUpgrade: boolean;
    @Field({ complexity: 0 }) canMint: boolean;
    @Field({ complexity: 0 }) canBurn: boolean;
    @Field({ complexity: 0 }) canChangeOwner: boolean;
    @Field({ complexity: 0 }) canPause: boolean;
    @Field({ complexity: 0 }) canFreeze: boolean;
    @Field({ complexity: 0 }) canWipe: boolean;
    @Field(() => IRoles, { nullable: true })
    roles?: IRoles;
    @Field({ nullable: true }) type?: string;
    @Field({ nullable: true, complexity: 0 }) balance?: string;
}
