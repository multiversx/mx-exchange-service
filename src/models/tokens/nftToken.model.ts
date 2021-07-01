import { ObjectType } from '@nestjs/graphql';
import { INftToken } from '../interfaces/nftToken.interface';
import { EsdtToken } from './esdtToken.model';

@ObjectType({
    implements: () => [INftToken],
})
export class NftToken extends EsdtToken implements INftToken {
    canAddSpecialRoles: boolean;
    canTransferNFTCreateRole: boolean;
    NFTCreateStopped: boolean;
    wiped: string;
    attributes?: string;
    creator?: string;
    nonce?: number;
    royalties?: string;
}
