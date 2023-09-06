import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class TransactionModel {
    @Field()
    nonce: number;
    @Field()
    value: string;
    @Field()
    sender: string;
    @Field()
    receiver: string;
    @Field({ nullable: true })
    senderUsername?: string;
    @Field({ nullable: true })
    receiverUsername?: string;
    @Field()
    gasPrice: number;
    @Field()
    gasLimit: number;
    @Field({ nullable: true })
    data?: string;
    @Field()
    chainID: string;
    @Field()
    version: number;
    @Field({ nullable: true })
    options?: number;
    @Field({ nullable: true })
    guardian?: string;
    @Field({ nullable: true })
    signature?: string;
    @Field({ nullable: true })
    guardianSignature?: string;

    constructor(init?: Partial<TransactionModel>) {
        Object.assign(this, init);
    }
}
