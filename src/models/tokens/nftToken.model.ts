import { ObjectType } from '@nestjs/graphql';
import { BaseNftToken } from '../interfaces/nftToken.interface';
import { EsdtToken } from './esdtToken.model';

@ObjectType({
    implements: () => [BaseNftToken],
})
export class NftToken extends EsdtToken implements BaseNftToken {
    canAddSpecialRoles: boolean;
    canTransferNFTCreateRole: boolean;
    NFTCreateStopped: boolean;
    wiped: string;
    attributes?: string;
    creator?: string;
    nonce?: number;
    royalties?: string;
}
