import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
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
                origin = req.headers['origin'];

                if (!origin) {
                    origin = 'Unknown';
                }
            }

            const profiler = new PerformanceProfiler();
            return next.handle().pipe(
                tap(() => {
                    profiler.stop();
                    if (parentType === 'Query') {
                        MetricsCollector.setQueryDuration(
                            fieldName,
                            origin,
                            profiler.duration,
                        );
                    }
                }),
            );
        }
        return next.handle();
    }
}
