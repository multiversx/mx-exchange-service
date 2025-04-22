import { Field, ObjectType } from '@nestjs/graphql';
import { IAssets, ISocial } from './assets.interface';
import { nestedFieldComplexity } from 'src/helpers/complexity/field.estimators';

@ObjectType({
    implements: () => [ISocial],
})
export class SocialModel implements ISocial {
    email?: string;
    blog?: string;
    twitter?: string;
    coinmarketcap?: string;
    coingecko?: string;

    constructor(init?: Partial<SocialModel>) {
        Object.assign(this, init);
    }
}

@ObjectType({
    implements: () => [IAssets],
})
export class AssetsModel implements IAssets {
    website?: string;
    description?: string;
    @Field(() => SocialModel, {
        nullable: true,
        complexity: nestedFieldComplexity,
    })
    social?: SocialModel;
    status?: string;
    pngUrl?: string;
    svgUrl?: string;
    lockedAccounts?: string[];
    extraTokens?: string[];

    constructor(init?: Partial<AssetsModel>) {
        Object.assign(this, init);

        this.social = new SocialModel(init?.social ?? {});
    }
}
