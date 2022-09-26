import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class FeesCollectorModel {
    constructor(init?: Partial<FeesCollectorModel>) {
        Object.assign(this, init);
    }
}
