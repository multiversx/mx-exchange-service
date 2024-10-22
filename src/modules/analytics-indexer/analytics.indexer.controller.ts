import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Param,
    Post,
    ValidationPipe,
} from '@nestjs/common';
import { CreateSessionDto } from './entities/session.interval.dto';
import { AnalyticsIndexerPersistenceService } from './services/analytics.indexer.persistence.service';
import mongoose from 'mongoose';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { IndexerSession } from './schemas/indexer.session.schema';
import { IndexerSessionRepositoryService } from 'src/services/database/repositories/indexer.session.repository';

@Controller('analytics-indexer')
export class AnalyticsIndexerController {
    constructor(
        private readonly indexerSessionRepository: IndexerSessionRepositoryService,
        private readonly indexerPersistenceService: AnalyticsIndexerPersistenceService,
        private readonly cachingService: CacheService,
    ) {}

    // @UseGuards(JwtOrNativeAdminGuard)
    @Get('/sessions')
    async getSessions(): Promise<IndexerSession[]> {
        return await this.indexerSessionRepository.find({});
    }

    // @UseGuards(JwtOrNativeAdminGuard)
    @Post('/sessions')
    async addSession(
        @Body(
            new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
        )
        createSessionDto: CreateSessionDto,
    ): Promise<IndexerSession> {
        try {
            return await this.indexerPersistenceService.createIndexerSession(
                createSessionDto,
            );
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
    }

    // @UseGuards(JwtOrNativeAdminGuard)
    @Get('/sessions/:nameOrID')
    async getSession(
        @Param('nameOrID') nameOrID: string,
    ): Promise<IndexerSession> {
        return await this.indexerSessionRepository.findOne(
            mongoose.Types.ObjectId.isValid(nameOrID)
                ? { _id: nameOrID }
                : { name: nameOrID },
        );
    }

    // @UseGuards(JwtOrNativeAdminGuard)
    @Post('/sessions/:nameOrID/abort')
    async abortSession(@Param('nameOrID') nameOrID: string): Promise<boolean> {
        const session = await this.indexerSessionRepository.findOne(
            mongoose.Types.ObjectId.isValid(nameOrID)
                ? { _id: nameOrID }
                : { name: nameOrID },
        );

        if (!session) {
            throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
        }

        this.cachingService.set(
            `indexer.abortSession.${session.name}`,
            true,
            Constants.oneHour(),
        );

        return true;
    }
}
