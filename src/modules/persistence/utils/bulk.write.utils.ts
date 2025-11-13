import {
    AnyBulkWriteOperation,
    UpdateOneModel,
    Filter,
    MatchKeysAndValues,
} from 'mongodb';

export function isUpdateOneOperation<T>(
    op: AnyBulkWriteOperation<T>,
): op is { updateOne: UpdateOneModel<T> } {
    return (op as any)?.updateOne != null;
}

export function extractValueFromFilter<T>(
    filter: Filter<T>,
    field: keyof T,
): string | undefined {
    const f = filter as any;
    const key = field in filter ? field : undefined;

    if (!key) {
        return;
    }

    const val = f[key];
    if (val && typeof val === 'object' && '$eq' in val) {
        return val.$eq as string;
    }

    if (typeof val !== 'object') {
        return val as string;
    }

    return;
}

export function extractValueFromSetOperation<T>(
    setObj: MatchKeysAndValues<T>,
    field: keyof T,
): string | undefined {
    if (typeof setObj[field] !== 'undefined') {
        return setObj.price as string;
    }

    return;
}
