export class CollectionType<T> {
    count: number;
    items: T[];

    constructor(init?: Partial<CollectionType<T>>) {
        Object.assign(this, init);
    }
}
