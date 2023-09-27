import {
    Injectable,
    CanActivate,
    ExecutionContext,
    Inject,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { Logger } from 'winston';
import { GqlAuthGuard } from './gql.auth.guard';
import { NativeAuthGuard } from './native.auth.guard';

@Injectable()
export class JwtOrNativeAuthGuard implements CanActivate {
    constructor(
        private readonly apiConfigService: ApiConfigService,
        private readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const jwtGuard = new GqlAuthGuard(this.apiConfigService, this.logger);
        const nativeAuthGuard = new NativeAuthGuard(
            this.apiConfigService,
            this.cachingService,
            this.logger,
        );

        const guards = [jwtGuard, nativeAuthGuard];

        const canActivateResponses = await Promise.all(
            guards.map((guard) => {
                try {
                    return guard.canActivate(context);
                } catch (error) {
                    this.logger.error(
                        `${JwtOrNativeAuthGuard.name}: ${error.message}`,
                    );
                    return false;
                }
            }),
        );

        const canActivate = canActivateResponses.reduce(
            (result, value) => result || value,
            false,
        );
        return canActivate;
    }
}
