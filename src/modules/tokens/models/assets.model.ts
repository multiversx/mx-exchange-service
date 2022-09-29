import { ObjectType } from '@nestjs/graphql';
import { IAssets } from './assets.interface';

@ObjectType({
    implements: () => [IAssets],
})
export class AssetsModel implements IAssets {
    website?: string;
    description?: string;
    status?: string;
    pngUrl?: string;
    svgUrl?: string;
    lockedAccounts?: string[];
    extraTokens?: string[];

    constructor(init?: Partial<AssetsModel>) {
        Object.assign(this, init);
    }
}
