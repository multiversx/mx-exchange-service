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
        const privateApiActive =
            this.configService.get<string>('ENABLE_PRIVATE_API');
        if (!privateApiActive) {
            throw new Error('No private api flag present');
        }
        return privateApiActive === 'true';
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

    isDeephistoryActive(): boolean {
        const deepHistoryFlag = this.configService.get<string>(
            'ENABLE_DEEP_HISTORY',
        );
        if (!deepHistoryFlag) {
            return false;
        }
        return deepHistoryFlag === 'true';
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
        const apiUrl = this.configService.get<string>('MX_API_URL');
        if (!apiUrl) {
            throw new Error('No apiUrl present');
        }
        return apiUrl;
    }

    getGatewayUrl(): string {
        const gatewayUrl = this.configService.get<string>('MX_GATEWAY_URL');
        if (!gatewayUrl) {
            throw new Error('No gatewayUrl present');
        }
        return gatewayUrl;
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

    getJwtSecret(): string {
        const secret = this.configService.get<string>('JWT_SECRET');
        if (!secret) {
            throw new Error('No jwt secret present');
        }

        return secret;
    }

    isAWSTimestreamRead(): boolean {
        const readFlag = this.configService.get<string>('AWS_TIMESTREAM_READ');
        if (!readFlag) {
            throw new Error('No AWS Timestream read flag present');
        }
        return readFlag === 'true';
    }

    isAWSTimestreamWrite(): boolean {
        const writeFlag = this.configService.get<string>(
            'AWS_TIMESTREAM_WRITE',
        );
        if (!writeFlag) {
            throw new Error('No AWS Timestream write flag present');
        }
        return writeFlag === 'true';
    }

    getNativeAuthMaxExpirySeconds(): number {
        const maxExpiry = this.configService.get<string>(
            'NATIVE_AUTH_MAX_EXPIRY_SECONDS',
        );
        if (!maxExpiry) {
            throw new Error('No native auth max expiry in seconds present');
        }
        return parseInt(maxExpiry);
    }

    getNativeAuthAcceptedOrigins(): string[] {
        const origins = this.configService.get<string>(
            'NATIVE_AUTH_ACCEPTED_ORIGINS',
        );
        if (!origins) {
            throw new Error('No accepted origins present');
        }

        return origins.split(',');
    }

    getImpersonateUrl(): string {
        const impersonateUrl =
            this.configService.get<string>('IMPERSONATE_URL');
        if (!impersonateUrl) {
            throw new Error('No impersonate url present');
        }

        return impersonateUrl;
    }

    getMXDataApiURL(): string {
        const url = this.configService.get<string>('MX_DATA_API_URL');
        if (!url) {
            throw new Error('No MX Data API url present');
        }
        return url;
    }

    getSecurityAdmins(): string[] {
        const admins = this.configService.get<string>('SECURITY_ADMINS');
        if (!admins) {
            throw new Error('No security admins present');
        }

        return admins.split(',');
    }

    getNativeAuthKeyPath(): string {
        const nativeAuthPemPath = this.configService.get<string>(
            'NATIVE_AUTH_PEM_PATH',
        );
        if (!nativeAuthPemPath) {
            throw new Error('No NATIVE_AUTH_PEM_PATH present');
        }
        return nativeAuthPemPath;
    }

    getTimescaleDbHost(): string {
        const host = this.configService.get<string>('TIMESCALEDB_URL');
        if (!host) {
            throw new Error('No TIMESCALEDB_URL present');
        }
        return host;
    }

    getTimescaleDbPort(): number {
        const port = this.configService.get<string>('TIMESCALEDB_PORT');
        if (!port) {
            throw new Error('No TIMESCALEDB_PORT present');
        }
        return parseInt(port);
    }

    getTimescaleDbDatabase(): string {
        const database = this.configService.get<string>('TIMESCALEDB_DATABASE');
        if (!database) {
            throw new Error('No TIMESCALEDB_DATABASE present');
        }
        return database;
    }

    getTimescaleDbUsername(): string {
        const username = this.configService.get<string>('TIMESCALEDB_USERNAME');
        if (!username) {
            throw new Error('No TIMESCALEDB_USERNAME present');
        }
        return username;
    }

    getTimescaleDbPassword(): string {
        const password = this.configService.get<string>('TIMESCALEDB_PASSWORD');
        if (!password) {
            throw new Error('No TIMESCALEDB_PASSWORD present');
        }
        return password;
    }

    getElasticSearchUrl(): string {
        const elasticSearchUrl =
            this.configService.get<string>('ELASTICSEARCH_URL');
        if (!elasticSearchUrl) {
            throw new Error('No Elastic Search url present');
        }

        return elasticSearchUrl;
    }

    getOpenExchangeRateAppID(): string {
        const appId = this.configService.get<string>(
            'OPEN_EXCHANGE_RATES_APP_ID',
        );
        if (!appId) {
            throw new Error('No OPEN_EXCHANGE_RATES_APP_ID present');
        }
        return appId;
    }

    getOpenExchangeRateUrl(): string {
        const url = this.configService.get<string>('OPEN_EXCHANGE_RATES_URL');
        if (!url) {
            throw new Error('No OPEN_EXCHANGE_RATES_URL present');
        }
        return url;
    }

    getRateLimiterSecret(): string | undefined {
        return this.configService.get<string>('RATE_LIMITER_SECRET');
    }
}
