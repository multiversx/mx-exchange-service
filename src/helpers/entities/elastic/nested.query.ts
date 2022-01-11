import { AbstractQuery } from './abstract.query';
import { MatchQuery } from './match.query';

export class NestedQuery extends AbstractQuery {
    buildQuery(key: string, value: MatchQuery[]): any {
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
