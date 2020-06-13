import {bind, /* inject, */ BindingScope} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {Message} from 'amqplib';
import {pick} from 'lodash';

export interface SyncOptions {
  repo: DefaultCrudRepository<any, any>;
  data: any;
  message: Message;
}

@bind({scope: BindingScope.SINGLETON})
export abstract class BaseModelSyncService {
  protected async sync({repo, data, message}: SyncOptions) {
    const action = this.getAction(message);
    const entity = this.createEntity(data, repo);
    switch (action) {
      case 'created':
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
    return exists ? repo.updateById(id, entity) : repo.create(entity);
  }
}
