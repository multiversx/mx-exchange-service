import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { AssetsModel } from './models/assets.model';
import { NftCollection } from './models/nftCollection.model';
import { RolesModel } from './models/roles.model';

@Resolver(NftCollection)
export class NftCollectionResolver extends GenericResolver {
    @ResolveField(() => AssetsModel, { nullable: true })
    async assets(parent: NftCollection): Promise<AssetsModel> {
        return new AssetsModel(parent.assets);
    }

    @ResolveField(() => RolesModel, { nullable: true })
    async roles(parent: NftCollection): Promise<RolesModel> {
        return new RolesModel(parent.roles);
    }
}
