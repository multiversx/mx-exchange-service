import { ApolloError } from "apollo-server-express";

export async function genericFieldResover(fieldResolver: () => any): Promise<any> {
    try {
        return await fieldResolver();
    } catch (error) {
        throw new ApolloError(error);
    }
}
