import { QueryField } from './query.field.type';

export class StoreResolvableQuery {
    queryName: string;
    queryAlias?: string;
    requestedFields: QueryField[];
    arguments: Record<string, any>;

    constructor(init?: Partial<StoreResolvableQuery>) {
        Object.assign(this, init);
    }
}
