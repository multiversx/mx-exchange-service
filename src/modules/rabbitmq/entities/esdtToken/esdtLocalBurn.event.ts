import { EsdtTokenTopics } from './esdtToken.topics';

export class EsdtLocalBurnEvent {
    private identifier = '';
    private topics = [];
    private decodedTopics: EsdtTokenTopics;

    constructor(init?: Partial<EsdtLocalBurnEvent>) {
        Object.assign(this, init);
        this.decodedTopics = new EsdtTokenTopics(this.topics);
    }

    getTopics() {
        return this.decodedTopics.toPlainObject();
    }
}
