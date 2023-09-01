import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PublicAppModule } from '../src/public.app.module';
import * as request from 'supertest';

describe('AppController (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture = await Test.createTestingModule({
            imports: [PublicAppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    it('/ (GET)', () => {
        return request
            .default(app.getHttpServer())
            .get('/')
            .expect(200)
            .expect('Hello World!');
    });
});
