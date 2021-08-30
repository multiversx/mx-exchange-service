import { Address } from '@elrondnetwork/erdjs/out';
import BigNumber from 'bignumber.js';

export class GenericEvent {
    private address = '';
    private identifier = '';
    protected topics = [];
    protected data = '';

    protected caller: Address;
    protected block: BigNumber;
    protected epoch: BigNumber;
    protected timestamp: BigNumber;

    constructor(init?: Partial<GenericEvent>) {
        Object.assign(this, init);
    }

    getAddress(): string {
        return this.address;
    }

    getIdentifier(): string {
        return this.identifier;
    }
}
