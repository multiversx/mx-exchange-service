import { ObjectType } from '@nestjs/graphql';
import { BaseToken } from '../interfaces/token.interface';

@ObjectType({
    implements: () => [BaseToken],
})
export class EsdtToken implements BaseToken {
    token: string;
    name: string;
    type: string;
    owner: string;
    minted: string;
    burnt: string;
    decimals: number;
    isPaused: boolean;
    canUpgrade: boolean;
    canMint: boolean;
    canBurn: boolean;
    canChangeOwner: boolean;
    canPause: boolean;
    canFreeze: boolean;
    canWipe: boolean;
    balance?: string;
    identifier?: string;
}
