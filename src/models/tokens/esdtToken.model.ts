import { ObjectType } from '@nestjs/graphql';
import { IToken } from '../interfaces/token.interface';

@ObjectType({
    implements: () => [IToken],
})
export class EsdtToken implements IToken {
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
