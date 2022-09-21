import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

@ObjectType()
export class FlagModel {
    @Field()
    name: string;
    @Field()
    value: boolean;

    constructor(init?: Partial<FlagModel>) {
        Object.assign(this, init);
    }
}

export enum FlagType {
    MAINTENANCE = 'MAINTENANCE',
    MULTISWAP = 'MULTISWAP',
    TIMESCALE_WRITE = 'TIMESCALE_WRITE',
    TIMESCALE_READ = 'TIMESCALE_READ',
    TIMESTREAM_WRITE = 'TIMESTREAM_WRITE',
}
registerEnumType(FlagType, { name: 'FlagType' });
