import { GenericEvent } from '../generic.event';
import { EsdtTokenTopics } from './esdtToken.topics';

export class EsdtLocalMintEvent extends GenericEvent {
    private decodedTopics: EsdtTokenTopics;

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new EsdtTokenTopics(this.topics);
    }

    getTopics() {
        return this.decodedTopics.toPlainObject();
    }
}
