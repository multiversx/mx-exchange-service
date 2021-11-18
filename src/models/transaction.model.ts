import { Transaction } from '@elrondnetwork/erdjs/out';
import { ObjectType, Field } from '@nestjs/graphql';
import { elrondConfig } from '../config';

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
    @Field()
    gasPrice: number;
    @Field()
    gasLimit: number;
    @Field()
    data: string;
    @Field()
    chainID: string;
    @Field()
    version: number;
    @Field({ nullable: true })
    options?: number;
    @Field({ nullable: true })
    status?: string;
    @Field({ nullable: true })
    signature?: string;

    constructor(init?: Partial<TransactionModel>) {
        Object.assign(this, init);
    }

    static fromTransaction(transaction: Transaction) {
        return transaction
            ? new TransactionModel({
                  nonce: transaction.getNonce().valueOf(),
                  value: transaction.getValue().toString(),
                  sender: transaction.getSender().bech32(),
                  receiver: transaction.getReceiver().bech32(),
                  gasPrice: transaction.getGasPrice().valueOf(),
                  gasLimit: transaction.getGasLimit().valueOf(),
                  data: transaction.getData().encoded(),
                  chainID: elrondConfig.chainID,
                  version: transaction.getVersion().valueOf(),
                  options: transaction.options.valueOf(),
                  status: transaction.getStatus().valueOf(),
              })
            : null;
    }
}
