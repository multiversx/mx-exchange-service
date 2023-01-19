import { PriceDiscoveryEvent } from '@multiversx/sdk-exchange';
import { Field } from '@nestjs/graphql';

export class PriceDiscoveryEventModel {
    @Field(() => String)
    private address: string;
    @Field(() => String)
    private identifier: string;
    protected topics = [];
    @Field(() => String)
    protected data: string;

    constructor(init?: Partial<PriceDiscoveryEvent>) {
        Object.assign(this, init);
    }
}
