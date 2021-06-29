import { GenericTransaction } from './generic.transaction';

export class ShardTransaction extends GenericTransaction {
    status = '';
    sourceShard = 0;
    destinationShard = 0;
}
