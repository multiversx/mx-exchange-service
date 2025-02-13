import {
    ConnectionArguments,
    ConnectionCursor,
    fromGlobalId,
} from 'graphql-relay';
import { Field, Int, InputType } from '@nestjs/graphql';
import { IsInt, IsOptional, Max } from 'class-validator';
import { PaginationArgs } from 'src/modules/dex.model';

type PagingMeta =
    | { pagingType: 'forward'; after?: string; first: number }
    | { pagingType: 'backward'; before?: string; last: number }
    | { pagingType: 'none' };

function checkPagingSanity(args: ConnectionArgs): PagingMeta {
    if (!args) {
        return { pagingType: 'none' };
    }
    const { first = 0, last = 0, after, before } = args;

    const isForwardPaging = !!first || !!after;
    const isBackwardPaging = !!last || !!before;
    if (isForwardPaging && isBackwardPaging) {
        throw new Error(
            'Relay pagination cannot be both forward and backward!',
        );
    }
    if ((isForwardPaging && before) || (isBackwardPaging && after)) {
        throw new Error('Paging must use either first/after or last/before!');
    }
    if ((isForwardPaging && first < 0) || (isBackwardPaging && last < 0)) {
        throw new Error('Paging limit must be positive!');
    }
    if (last && !before) {
        throw new Error(
            "When paging backwards, a 'before' argument is required!",
        );
    }

    // eslint-disable-next-line no-nested-ternary
    return isForwardPaging
        ? { pagingType: 'forward', after, first }
        : isBackwardPaging
        ? { pagingType: 'backward', before, last }
        : { pagingType: 'none' };
}

const getId = (cursor: ConnectionCursor) =>
    parseInt(fromGlobalId(cursor).id, 10);
const nextId = (cursor: ConnectionCursor) => getId(cursor) + 1;

export function getPagingParameters(args: ConnectionArgs): PaginationArgs {
    const meta = checkPagingSanity(args);

    if (!args) {
        args = new ConnectionArgs();
    }

    switch (meta.pagingType) {
        case 'forward': {
            return {
                limit: meta.first,
                offset: meta.after ? nextId(meta.after) : 0,
            };
        }
        case 'backward': {
            const { last, before } = meta;
            let limit = last;
            let offset = getId(before!) - last;

            if (offset < 0) {
                limit = Math.max(last + offset, 0);
                offset = 0;
            }

            return { offset, limit };
        }
        default:
            args.first = 10;
            return { offset: 0, limit: 10 };
    }
}

@InputType()
export default class ConnectionArgs implements ConnectionArguments {
    @Field({ nullable: true, description: 'Paginate before opaque cursor' })
    public before?: ConnectionCursor;

    @Field({ nullable: true, description: 'Paginate after opaque cursor' })
    public after?: ConnectionCursor;

    @IsOptional()
    @Max(1000)
    @Field(() => Int, { nullable: true, description: 'Paginate first' })
    public first?: number;

    @IsOptional()
    @Max(1000)
    @Field(() => Int, { nullable: true, description: 'Paginate last' })
    public last?: number;
}
