import {bind, /* inject, */ BindingScope} from '@loopback/core';
import {DefaultCrudRepository, EntityNotFoundError} from '@loopback/repository';
import {Message} from 'amqplib';
import {pick} from 'lodash';
import {ValidatorService} from './validator.service';

export interface SyncOptions {
  repo: DefaultCrudRepository<any, any>;
  data: any;
  message: Message;
}

@bind({scope: BindingScope.SINGLETON})
export abstract class BaseModelSyncService {
  constructor(private validateService: ValidatorService) {}

  protected async sync({repo, data, message}: SyncOptions) {
    const action = this.getAction(message);
    const entity = this.createEntity(data, repo);
    switch (action) {
      case 'created':
        await this.validateService.validate({
          data: entity,
          entityClass: repo.entityClass,
        });
        await repo.create(entity);
        break;
      case 'updated':
        await this.updateOrCreate(repo, entity.id, entity);
        break;
      case 'deleted':
        await repo.deleteById(entity.id);
        break;
      default:
        break;
    }
  }

  protected getAction(message: Message) {
    return message.fields.routingKey.split('.')[2];
  }

  /** Evita o envio de dados que não pertencam ao schema da model */
  protected createEntity(data: any, repo: DefaultCrudRepository<any, any>) {
    return pick(data, Object.keys(repo.entityClass.definition.properties));
  }

  protected async updateOrCreate(
    repo: DefaultCrudRepository<any, any>,
    id: string,
    entity: any,
  ) {
    const exists = await repo.exists(id);
    await this.validateService.validate({
      data: entity,
      entityClass: repo.entityClass,
      ...(exists && {options: {partial: true}}),
    });
    return exists ? repo.updateById(id, entity) : repo.create(entity);
  }

  protected async syncRelations({
    id,
    relation,
    repo,
    relationIds,
    repoRelation,
    message,
  }: {
    id: string;
    relation: string;
    relationIds: Array<string>;
    repo: DefaultCrudRepository<any, any>;
    repoRelation: DefaultCrudRepository<any, any>;
    message: Message;
  }) {
    //pega campos necessários no campo nested(através dos metadados)
    const fieldsRelation = Object.keys(
      repo.modelClass.definition.properties[relation].jsonSchema.items
        .properties,
    ).reduce((obj: any, field: string) => {
      obj[field] = true;
      return obj;
    }, {});

    const collection = await repoRelation.find({
      where: {
        or: relationIds.map((idRelation) => ({id: idRelation})),
      },
      fields: fieldsRelation,
    });
    if (!collection.length) {
      const error = new EntityNotFoundError(
        repoRelation.entityClass,
        relationIds,
      );
      error.name = 'EntityNotFound';
      throw error;
    }

    await repo.updateById(id, {[relation]: collection});
  }
}
