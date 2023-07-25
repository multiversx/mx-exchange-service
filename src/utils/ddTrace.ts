import tracer from 'dd-trace';

export function AsyncDDTrace() {
    return (
        _target: object,
        _key: string | symbol,
        descriptor: PropertyDescriptor,
    ) => {
        const childMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const traceName = childMethod.name;
            const activeSpan = tracer.scope().active();
            const span = tracer.startSpan(traceName, {
                childOf: activeSpan,
            });

            const result = await childMethod.apply(this, args);
            span.finish();
            return result;
        };

        return descriptor;
    };
}

export function SyncDDTrace() {
    return (
        _target: object,
        _key: string | symbol,
        descriptor: PropertyDescriptor,
    ) => {
        const childMethod = descriptor.value;

        descriptor.value = function (...args: any[]) {
            const traceName = childMethod.name;

            return tracer.wrap(traceName, childMethod.apply(this, args));
        };

        return descriptor;
    };
}
