import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAdminGuard } from '../auth/jwt.admin.guard';
import { CreateTokenDto } from './dto/create.token.dto';
import { TokenDBService } from './services/token.db.service';

@Controller()
export class TokenController {
    constructor(private readonly tokenDbService: TokenDBService) {}

    @UseGuards(JwtAdminGuard)
    @Post('/token/create')
    async createToken(@Body() createTokenDto: CreateTokenDto) {
        await this.tokenDbService.createToken(createTokenDto);
    }

    @UseGuards(JwtAdminGuard)
    @Post('/token/update')
    async updateToken(@Body() updateTokenDto: CreateTokenDto) {
        await this.tokenDbService.updateToken(updateTokenDto);
    }
}
