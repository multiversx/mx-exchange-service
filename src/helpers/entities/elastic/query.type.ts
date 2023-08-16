import { ExistsQuery } from './exists.query';
import { MatchQuery } from './match.query';
import { NestedQuery } from './nested.query';
import { QueryOperator } from './query.operator';
import { RangeQuery } from './range.query';
import { WildcardQuery } from './wildcard.query';
import { TermQuery } from './term.query';

export class QueryType {
    static Match = (
        key: string,
        value: any | undefined,
        operator: QueryOperator | undefined = undefined,
    ): MatchQuery => {
        return new MatchQuery(key, value, operator).getQuery();
    };

    static Exists = (
        key: string,
        value: any | undefined = undefined,
        operator: QueryOperator | undefined = undefined,
    ): ExistsQuery => {
        return new ExistsQuery(key, value, operator).getQuery();
    };

    static Range = (
        key: string,
        value: any | undefined,
        operator: QueryOperator | undefined = undefined,
    ): RangeQuery => {
        return new RangeQuery(key, value, operator).getQuery();
    };

    static Wildcard = (
        key: string,
        value: any | undefined,
        operator: QueryOperator | undefined = undefined,
    ): WildcardQuery => {
        return new WildcardQuery(key, value, operator).getQuery();
    };

    static Nested = (
        key: string,
        value: MatchQuery[] | undefined,
        operator: QueryOperator | undefined = undefined,
    ): NestedQuery => {
        return new NestedQuery(key, value, operator).getQuery();
    };

    static Term = (
        key: string,
        value: any | undefined,
        operator: QueryOperator | undefined = undefined,
    ): TermQuery => {
        return new TermQuery(key, value, operator).getQuery();
    }
}
