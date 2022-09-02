import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAdminGuard } from '../auth/jwt.admin.guard';
import { CreateTokenDto } from './dto/create.token.dto';
import { TokenRepositoryService } from './services/token.repository.service';
import { TokenSetterService } from './services/token.setter.service';

@Controller()
export class TokenController {
    constructor(
        private readonly tokenRepositoryService: TokenRepositoryService,
        private readonly tokenSetter: TokenSetterService,
    ) {}

    @UseGuards(JwtAdminGuard)
    @Post('/token/create')
    async createToken(@Body() createTokenDto: CreateTokenDto) {
        await this.tokenRepositoryService.create(createTokenDto);
        await this.tokenSetter.setEsdtTokenType(
            createTokenDto.tokenID,
            createTokenDto.type,
        );
    }

    @UseGuards(JwtAdminGuard)
    @Post('/token/update')
    async updateToken(@Body() updateTokenDto: CreateTokenDto) {
        await this.tokenRepositoryService.updateToken(updateTokenDto);
        await this.tokenSetter.setEsdtTokenType(
            updateTokenDto.tokenID,
            updateTokenDto.type,
        );
    }
}
