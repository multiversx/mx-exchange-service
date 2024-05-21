import { connectionFromArraySlice } from 'graphql-relay';
import ConnectionArgs from './filters/connection.args';

export default class PageResponse {
    static mapResponse<T>(
        returnList: T[],
        args: ConnectionArgs,
        count: number,
        offset: number,
        limit: number,
    ) {
        const page = connectionFromArraySlice(returnList, args, {
            arrayLength: count,
            sliceStart: offset || 0,
        });
        return {
            edges: page.edges,
            pageInfo: page.pageInfo,
            pageData: { count, limit, offset },
        };
    }
}
