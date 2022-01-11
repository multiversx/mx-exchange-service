import { AbstractQuery } from './abstract.query';

export class NestedQuery extends AbstractQuery {
    buildQuery(key: string, value: AbstractQuery[]): any {
        return {
            nested: {
                path: key,
                query: {
                    bool: {
                        must: value,
                    },
                },
            },
        };
    }
}
