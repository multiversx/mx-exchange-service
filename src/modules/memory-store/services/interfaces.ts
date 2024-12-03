import { QueryField } from '../entities/query.field.type';

export abstract class IMemoryStoreService<T, V> {
    abstract isReady(): boolean;
    abstract getData(): T[] | T;
    abstract getSortedAndFilteredData(
        fields: QueryField[],
        queryArguments: Record<string, any>,
        isFilteredQuery: boolean,
    ): T[] | V;
    static targetedQueries: Record<
        string,
        {
            isFiltered: boolean;
            missingFields: QueryField[];
            identifierField: string;
        }
    >;
}
