import { Document, FilterQuery, Model, UpdateQuery } from 'mongoose';

export abstract class EntityRepository<T extends Document> {
    constructor(protected readonly entityModel: Model<T>) {}

    async create(createEntityData: any): Promise<T> {
        const entity = new this.entityModel(createEntityData);
        return entity.save();
    }

    async findOne(
        entityFilterQuery: FilterQuery<T>,
        projection?: Record<string, unknown>,
    ): Promise<T | null> {
        return this.entityModel
            .findOne(entityFilterQuery, {
                _id: 0,
                ...projection,
            })
            .exec();
    }

    async find(entityFilterQuery: FilterQuery<T>): Promise<T[] | null> {
        return this.entityModel.find(entityFilterQuery);
    }

    async findOneAndUpdate(
        entityFilterQuery: FilterQuery<T>,
        updateEntityData: UpdateQuery<any>,
    ): Promise<T | null> {
        return this.entityModel.findOneAndUpdate(
            entityFilterQuery,
            updateEntityData,
            {
                new: true,
            },
        );
    }

    async findOneAndDelete(
        entityFilterQuery: FilterQuery<T>,
    ): Promise<boolean> {
        const entity = this.entityModel.findOneAndDelete(entityFilterQuery);
        return (await entity).$isDeleted();
    }

    async deleteMany(entityFilterQuery: FilterQuery<T>): Promise<boolean> {
        const deleteResult = this.entityModel.deleteMany(entityFilterQuery);
        return (await deleteResult).deletedCount >= 1;
    }
}
