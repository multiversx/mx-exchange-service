import { Injectable } from '@nestjs/common';
import { NativeAuthClient } from '@elrondnetwork/native-auth-client';
import { SignableMessage } from '@elrondnetwork/erdjs/out';
import { UserSigner } from '@elrondnetwork/erdjs-walletcore/out';
import { ApiConfigService } from 'src/helpers/api.config.service';

@Injectable()
export class NativeAuthClientService {
    private readonly client: NativeAuthClient;
    private signableToken: string;

    constructor(private readonly apiConfig: ApiConfigService) {
        this.client = new NativeAuthClient({
            host: this.apiConfig.getAppName(),
            apiUrl: this.apiConfig.getApiUrl(),
        });
        this.client
            .initialize({
                env: this.apiConfig.getNodeEnv(),
            })
            .then((res) => {
                this.signableToken = res;
            });
    }

    async getToken(): Promise<string> {
        const PEM_KEY = this.apiConfig.getNativeAuthPemKey();
        const PEM_ADDRESS = this.apiConfig.getNativeAuthPemAddress();

        const messageToSign = `${PEM_ADDRESS}${this.signableToken}{}`;
        const signableMessage = new SignableMessage({
            message: Buffer.from(messageToSign, 'utf8'),
        });
        const pem = UserSigner.fromPem(PEM_KEY);
        await pem.sign(signableMessage);

        const signature = signableMessage.getSignature();

        const accessToken = this.client.getToken(
            PEM_ADDRESS,
            this.signableToken,
            signature.hex(),
        );

        return accessToken;
    }
}
