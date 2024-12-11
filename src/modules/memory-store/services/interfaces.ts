import { QueryField } from '../entities/query.field.type';

export abstract class IMemoryStoreService<T, V> {
    abstract isReady(): boolean;
    abstract getAllData(): T[] | T;
    abstract getQueryResponse(
        queryName: string,
        queryArguments: Record<string, any>,
        requestedFields: QueryField[],
    ): T[] | V;
    abstract appendFieldsToQueryResponse(
        queryName: string,
        response: T[] | V,
        requestedFields: QueryField[],
    ): T[] | V;
    abstract getTargetedQueries(): Record<
        string,
        {
            isFiltered: boolean;
            missingFields: QueryField[];
            identifierField: string;
        }
    >;
    abstract getTypenameMapping(): Record<string, Record<string, string>>;
}
