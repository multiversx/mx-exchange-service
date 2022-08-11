import { Injectable } from '@nestjs/common';
import { NativeAuthClient } from '@elrondnetwork/native-auth-client';
import { SignableMessage } from '@elrondnetwork/erdjs/out';
import { UserSigner } from '@elrondnetwork/erdjs-walletcore/out';

@Injectable()
export class NativeAuthClientService {
    private readonly client: NativeAuthClient;
    private signableToken: string;

    constructor() {
        this.client = new NativeAuthClient({ host: process.env.APP_NAME });
        this.client
            .initialize({
                env: process.env.NODE_ENV,
            })
            .then(res => {
                this.signableToken = res;
            });
    }

    async getToken(): Promise<string> {
        const PEM_KEY = process.env.NATIVE_AUTH_PEM_KEY;
        const PEM_ADDRESS = process.env.NATIVE_AUTH_PEM_ADDRESS;

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
