import { EnergyType } from '@elrondnetwork/erdjs-dex';
import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';

export enum UnlockType {
    TERM_UNLOCK,
    EARLY_UNLOCK,
    REDUCE_PERIOD,
}

registerEnumType(UnlockType, {
    name: 'UnlockType',
});

@ObjectType()
export class EnergyModel {
    @Field()
    amount: string;
    @Field(() => Int)
    lastUpdateEpoch: number;
    @Field()
    totalLockedTokens: string;

    constructor(init?: Partial<EnergyType>) {
        Object.assign(this, init);
    }
}
