import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { ContextTracker } from '@multiversx/sdk-nestjs-common';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        if (context.getType<GqlContextType>() === 'graphql') {
            const gqlContext = GqlExecutionContext.create(context);

            const { req } = gqlContext.getContext();

            let timestamp: number = undefined;
            if (req !== undefined) {
                timestamp = req?.headers?.['timestamp'];
                ContextTracker.assign({
                    deepHistoryTimestamp: timestamp,
                });
            }
            return next.handle().pipe();
        }
        return next.handle();
    }
}
