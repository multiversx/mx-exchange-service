export const formatNullOrUndefined = (value: any): any => {
    if (typeof value === 'undefined') {
        return 'undefined';
    }

    if (value === null) {
        return 'null';
    }

    return value;
};

export const parseCachedNullOrUndefined = (cachedValue: any): any => {
    if (cachedValue === 'undefined') {
        return undefined;
    }

    if (cachedValue === 'null') {
        return null;
    }

    return cachedValue;
};
