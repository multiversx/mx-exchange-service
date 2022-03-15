import { Address, BinaryCodec } from '@elrondnetwork/erdjs/out';
import { Field, ObjectType } from '@nestjs/graphql';
import { UserEntryModel } from 'src/modules/metabonding/models/metabonding.model';
import { MetabondingEventTopics } from './metabonding.event.topics';

@ObjectType()
export class MetabondingEvent {
    private decodedTopics: MetabondingEventTopics;

    @Field()
    private address: string;

    private identifier = '';
    protected topics = [];
    protected data = '';

    @Field(() => String)
    protected caller: Address;
    @Field(() => UserEntryModel)
    private userEntry: UserEntryModel;

    constructor(init?: Partial<MetabondingEvent>) {
        Object.assign(this, init);
        this.decodedTopics = new MetabondingEventTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        this.userEntry = new UserEntryModel({
            tokenNonce: decodedEvent.tokenNonce.toNumber(),
            stakedAmount: decodedEvent.stakeAmount.toFixed(),
            unstakedAmount: decodedEvent.unstakeAmount.toFixed(),
            unbondEpoch: decodedEvent.unbondEpoch.toNumber(),
        });
    }

    getTopics(): MetabondingEventTopics {
        return this.decodedTopics;
    }

    getUserEntry(): UserEntryModel {
        return this.userEntry;
    }

    private decodeEvent() {
        const data = Buffer.from(this.data, 'base64');
        const codec = new BinaryCodec();
        const [decoded] = codec.decodeNested(
            data,
            UserEntryModel.getStructure(),
        );
        return decoded.valueOf();
    }
}
