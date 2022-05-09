import { BigNumber } from 'bignumber.js';

export type Graph = Record<string, GraphItem>;
export type GraphItem = Record<
    string,
    {
        address: string;
    }
>;
export type QueueItem = {
    intermediaryAmount: string;
    tokenID: string;
    address: string;
};

export class MaxPriorityQueue {
    queue: QueueItem[];

    constructor() {
        this.queue = [];
    }

    sorter(
        a: { intermediaryAmount: string },
        b: { intermediaryAmount: string },
    ): number {
        /*this.logger.debug(
            'sorter ' + a.intermediaryAmount + ' ' + b.intermediaryAmount,
            12,
        );*/
        const diff = new BigNumber(b.intermediaryAmount).minus(
            a.intermediaryAmount,
        );
        if (new BigNumber(diff).isGreaterThan(0)) return 1;
        else if (new BigNumber(diff).isEqualTo(0)) return 0;
        else return -1;
    }

    /**
     * Add a new item to the queue and ensure the highest priority element
     * is at the front of the queue.
     * ps: highest priority not accurate due to different currencies.
     */
    push(item: QueueItem): void {
        /*this.logger.debug(
            'push ' +
                item.tokenID +
                ' ' +
                item.intermediaryAmount +
                ' ' +
                item.address,
            12,
        );*/
        const length = this.queue.length;
        this.queue.push(item);
        this.swim(length);
    }

    parent(i: number): number {
        //this.logger.debug('parent ' + i, 12);
        return Math.floor((i - 1) / 2);
    }

    left(i: number): number {
        //this.logger.debug('left ' + i, 12);
        return i * 2 + 1;
    }

    right(i: number): number {
        //this.logger.debug('right ' + i, 12);
        return i * 2 + 2;
    }

    swim(i: number): void {
        //this.logger.debug('swim ' + i, 12);
        const queue = this.queue;
        while (i > 0) {
            const pi = this.parent(i);
            if (this.sorter(queue[i], queue[pi]) >= 0) {
                break;
            }
            this.swap(pi, i);
            i = pi;
        }
    }

    sink(i: number): void {
        //this.logger.debug('sink ' + i, 12);
        const queue = this.queue;
        // left child index in queue
        const li = this.left(i);
        while (li < queue.length) {
            // current biggest_priority index of data from cur, left child and right child;
            let bi = i;
            if (this.sorter(queue[li], queue[bi]) > 0) {
                bi = li;
            }
            // right child index of i
            const ri = this.right(i);
            if (ri < queue.length && this.sorter(queue[ri], queue[bi]) > 0) {
                bi = ri;
            }
            if (bi === i) {
                break;
            }
            this.swap(bi, i);
            i = bi;
        }
    }

    swap(i: number, j: number): void {
        //this.logger.debug('swap ' + i + ' ' + j, 12);
        const tem = this.queue[i];
        this.queue[i] = this.queue[j];
        this.queue[j] = tem;
    }
    /**
     * Return the highest priority element in the queue.
     * caller should guarantee current queue is not empty
     */
    pop(): QueueItem {
        //this.logger.debug('pop ', 12);
        this.swap(0, this.queue.length - 1);
        const item = this.queue.pop();
        this.sink(0);
        return item;
    }

    empty(): boolean {
        //this.logger.debug('empty ', 12);
        return this.queue.length === 0;
    }

    eagerPush(newItem: QueueItem, currentCost: string): boolean {
        let foundLessGoodValue = false;
        let foundBetterValue = false;

        // parse queue, remove less good costs & add the current cost if it's the best one yet
        for (let i = this.queue.length - 1; i >= 0; --i) {
            if (this.queue[i].tokenID == newItem.tokenID) {
                if (
                    this.queue[i].intermediaryAmount <
                    newItem.intermediaryAmount
                ) {
                    // less good cost found => delete
                    this.queue.splice(i, 1);
                    foundLessGoodValue = true;
                } else {
                    // better cost found => break
                    foundBetterValue = true;
                    break;
                }
            }
        }

        if (foundLessGoodValue && !foundBetterValue) {
            // better cost
            //this.logger.debug('OVERWRITING PUSH', 12);
            this.push(newItem);
            return true;
        } else if (
            !foundLessGoodValue &&
            !foundBetterValue &&
            typeof currentCost === 'undefined'
        ) {
            // first cost for this position/token
            //this.logger.debug('FIRST PUSH', 12);
            this.push(newItem);
            return true;
        }

        return false;
    }
}
