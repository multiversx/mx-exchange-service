import { FieldMiddleware, MiddlewareContext, NextFn } from '@nestjs/graphql';
import { Path } from 'graphql/jsutils/Path';
import { MetricsCollector } from './metrics.collector';
import { PerformanceProfiler } from './performance.profiler';

function getFieldPath(path: Path): string {
    let currentDescription = '';

    if (path.prev) {
        currentDescription += getFieldPath(path.prev);
    }

    if (currentDescription !== '') {
        currentDescription += '.';
    }

    return currentDescription + path.key;
}

export const loggerMiddleware: FieldMiddleware = async (
    ctx: MiddlewareContext,
    next: NextFn,
) => {
    const fieldName = ctx.info.parentType.name + '.' + ctx.info.fieldName;
    const fieldPath = getFieldPath(ctx.info.path);

    const profiler = new PerformanceProfiler();
    const value = await next();
    profiler.stop();

    MetricsCollector.setFieldDuration(fieldName, fieldPath, profiler.duration);

    return value;
};
