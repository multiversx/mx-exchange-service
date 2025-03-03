import { Field, ObjectType } from '@nestjs/graphql';
import { AssetsModel } from './assets.model';
import { INFTCollection } from './nft.interface';
import { RolesModel } from './roles.model';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';

@ObjectType({
    implements: () => [INFTCollection],
})
export class NftCollection implements INFTCollection {
    collection: string;
    name: string;
    ticker: string;
    decimals: number;
    issuer: string;
    timestamp: number;
    canUpgrade: boolean;
    canMint: boolean;
    canBurn: boolean;
    canChangeOwner: boolean;
    canPause: boolean;
    canFreeze: boolean;
    canWipe: boolean;
    canAddSpecialRoles: boolean;
    canTransferNFTCreateRole: boolean;
    NFTCreateStopped: boolean;
    @Field(() => AssetsModel, {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    assets?: AssetsModel;
    @Field(() => RolesModel, {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    roles?: RolesModel;

    constructor(init?: Partial<NftCollection>) {
        Object.assign(this, init);
        if (init.assets) {
            this.assets = new AssetsModel(init.assets);
        }
        if (init.roles) {
            this.roles = new RolesModel(init.roles);
        }
    }
}
