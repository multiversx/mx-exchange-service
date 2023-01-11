import { appendFile } from 'fs';
import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CpuProfiler } from './cpu.profiler';
import { MetricsCollector } from './metrics.collector';
import { PerformanceProfiler } from './performance.profiler';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        if (context.getType<GqlContextType>() === 'graphql') {
            const gqlContext = GqlExecutionContext.create(context);
            const info = gqlContext.getInfo();
            const parentType = info.parentType.name;
            const fieldName = info.fieldName;

            const { req } = gqlContext.getContext();

            let origin = 'Unknown';
            if (req !== undefined) {
                origin = req?.headers?.['origin'] ?? 'Unknown';
            }

            const { url, originalUrl, headers, method, body } = req;

            // eslint-disable-next-line @typescript-eslint/no-empty-function
            appendFile('/app/dist/logs/httpLogs.txt', `${JSON.stringify({ url, originalUrl, headers, method, body })}\n`, () => { });

            const profiler = new PerformanceProfiler();
            const cpuProfiler = new CpuProfiler();

            return next.handle().pipe(
                tap(() => {
                    profiler.stop();
                    const cpuTime = cpuProfiler.stop();
                    if (parentType === 'Query') {
                        MetricsCollector.setQueryDuration(
                            fieldName,
                            origin,
                            profiler.duration,
                        );

                        MetricsCollector.setQueryCpu(
                            fieldName,
                            origin,
                            cpuTime,
                        );
                    }
                }),
            );
        }
        return next.handle();
    }
}
