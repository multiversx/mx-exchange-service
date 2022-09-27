import { ObjectType } from '@nestjs/graphql';
import { IRoles } from './roles.interface';

@ObjectType({
    implements: () => [IRoles],
})
export class RolesModel implements IRoles {
    address?: string;
    canMint?: boolean;
    canBurn?: boolean;
    roles?: string[];

    constructor(init?: Partial<RolesModel>) {
        Object.assign(this, init);
    }
}
