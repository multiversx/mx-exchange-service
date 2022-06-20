import { Field, ObjectType } from '@nestjs/graphql';
import { FlagModel } from './flag.model';
import { SCAddressModel } from './sc-address.model';

@ObjectType()
export class RemoteConfigSCAddressesModel {
    @Field(() => [SCAddressModel], { nullable: true })
    staking: Promise<SCAddressModel[]>;

    @Field(() => [SCAddressModel], { nullable: true })
    stakingProxy: Promise<SCAddressModel[]>;

    constructor(init?: Partial<RemoteConfigSCAddressesModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class RemoteConfigModel {
    @Field(() => RemoteConfigSCAddressesModel)
    scAddresses: RemoteConfigSCAddressesModel;

    @Field(() => [FlagModel])
    flags: FlagModel[];

    constructor(init?: Partial<RemoteConfigModel>) {
        Object.assign(this, init);
    }
}
