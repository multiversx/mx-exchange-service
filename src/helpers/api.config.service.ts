import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiConfigService {
    constructor(private readonly configService: ConfigService) {}

    getPublicAppPort(): number {
        const port = this.configService.get<number>('PORT');
        if (!port) {
            throw new Error('No public app port present');
        }
        return port;
    }

    getPublicAppListenAddress(): string {
        const listenAddress = this.configService.get<string>('LISTEN_ADDRESS');
        if (!listenAddress) {
            throw new Error('No public app listen address present');
        }
        return listenAddress;
    }

    getPrivateAppPort(): number {
        const port = this.configService.get<number>('PRIVATE_PORT');
        if (!port) {
            throw new Error('No private app port present');
        }
        return port;
    }

    getPrivateAppListenAddress(): string {
        const listenAddress = this.configService.get<string>(
            'PRIVATE_LISTEN_ADDRESS',
        );
        if (!listenAddress) {
            throw new Error('No private app listen address present');
        }
        return listenAddress;
    }

    getCacheWarmerPort(): number {
        const port = this.configService.get<number>('CACHEWARMER_PORT');
        if (!port) {
            throw new Error('No cache warmer app port present');
        }
        return port;
    }

    isPublicApiActive(): boolean {
        const publicApiActive =
            this.configService.get<string>('ENABLE_PUBLIC_API');
        if (!publicApiActive) {
            throw new Error('No public api flag present');
        }
        return publicApiActive === 'true';
    }

    isCacheWarmerCronActive(): boolean {
        const cacheWramerActive = this.configService.get<string>(
            'ENABLE_CACHE_WARMER',
        );
        if (!cacheWramerActive) {
            throw new Error('No cache warmer flag present');
        }
        return cacheWramerActive === 'true';
    }

    isPrivateAppActive(): boolean {
        const privateAppActive =
            this.configService.get<string>('ENABLE_PRIVATE_API');
        if (!privateAppActive) {
            throw new Error('No private api flag present');
        }
        return privateAppActive === 'true';
    }

    isEventsNotifierAppActive(): boolean {
        const eventsNotifierAppActive = this.configService.get<string>(
            'ENABLE_EVENTS_NOTIFIER',
        );
        if (!eventsNotifierAppActive) {
            throw new Error('No events notifier api flag present');
        }
        return eventsNotifierAppActive === 'true';
    }

    isTracerActive(): boolean {
        const tracerFlag = this.configService.get<string>('ENABLE_TRACER');
        if (!tracerFlag) {
            throw new Error('No tracer flag present');
        }
        return tracerFlag === 'true';
    }

    getRedisUrl(): string {
        const redisUrl = this.configService.get<string>('REDIS_URL');
        if (!redisUrl) {
            throw new Error('No redis url present');
        }
        return redisUrl;
    }

    getRedisPort(): number {
        const redisPort = this.configService.get<number>('REDIS_PORT');
        if (!redisPort) {
            throw new Error('No redis port present');
        }
        return redisPort;
    }

    getRedisPassword(): string | undefined {
        const password = this.configService.get<string>('REDIS_PASSWORD');
        return password !== '' ? password : undefined;
    }

    getApiUrl(): string {
        const apiUrl = this.configService.get<string>('ELRONDAPI_URL');
        if (!apiUrl) {
            throw new Error('No apiUrl present');
        }
        return apiUrl;
    }

    getKeepAliveTimeoutDownstream(): number {
        const keepAliveTimeoutDownstream = this.configService.get<string>(
            'KEEPALIVE_TIMEOUT_DOWNSTREAM',
        );
        if (!keepAliveTimeoutDownstream) {
            throw new Error('No keepAliveTimeoutDownstream present');
        }

        return parseInt(keepAliveTimeoutDownstream);
    }

    getKeepAliveTimeoutUpstream(): number {
        const keepAliveTimeoutUpstream = this.configService.get<string>(
            'KEEPALIVE_TIMEOUT_UPSTREAM',
        );
        if (!keepAliveTimeoutUpstream) {
            throw new Error('No keepAliveTimeoutUpstream present');
        }
        return parseInt(keepAliveTimeoutUpstream);
    }

    getMongoDBURL(): string {
        const mongoDBUrl = this.configService.get<string>('MONGODB_URL');
        if (!mongoDBUrl) {
            throw new Error('No MongoDB URL present');
        }
        return mongoDBUrl;
    }

    getMongoDBDatabase(): string {
        const mongoDBDatabase =
            this.configService.get<string>('MONGODB_DATABASE');
        if (!mongoDBDatabase) {
            throw new Error('No MongoDB Database present');
        }
        return mongoDBDatabase;
    }

    getMongoDBUsername(): string {
        const mongoDBUsername =
            this.configService.get<string>('MONGODB_USERNAME');
        if (!mongoDBUsername) {
            throw new Error('No MongoDB username present');
        }
        return mongoDBUsername;
    }

    getMongoDBPassword(): string {
        const mongoDBPassword =
            this.configService.get<string>('MONGODB_PASSWORD');
        if (!mongoDBPassword) {
            throw new Error('No MongoDB password present');
        }
        return mongoDBPassword;
    }

    getSecurityAdmins(): string[] {
        const admins = this.configService.get<string>('SECURITY_ADMINS');
        if (!admins) {
            throw new Error('No security admins present');
        }

        return admins.split(',');
    }
}
