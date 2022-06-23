import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAdminGuard } from '../auth/jwt.admin.guard';
import { CreateTokenDto } from './dto/create.token.dto';
import { TokenRepositoryService } from './services/token.repository.service';

@Controller()
export class TokenController {
    constructor(
        private readonly tokenRepositoryService: TokenRepositoryService,
    ) {}

    @UseGuards(JwtAdminGuard)
    @Post('/token/create')
    async createToken(@Body() createTokenDto: CreateTokenDto) {
        await this.tokenRepositoryService.create(createTokenDto);
    }

    @UseGuards(JwtAdminGuard)
    @Post('/token/update')
    async updateToken(@Body() updateTokenDto: CreateTokenDto) {
        await this.tokenRepositoryService.updateToken(updateTokenDto);
    }
}
