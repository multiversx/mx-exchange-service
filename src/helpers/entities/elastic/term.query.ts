import { AbstractQuery } from './abstract.query';

export class TermQuery extends AbstractQuery {
    buildQuery(key: string, value: any): any {
        const queryObj: any = {};
        queryObj[key] = value;
        return {
            term: queryObj,
        };
    }
}
