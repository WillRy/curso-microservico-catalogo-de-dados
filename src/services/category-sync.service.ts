import {bind, BindingScope} from '@loopback/core';
import {repository} from '@loopback/repository';
import {ConsumeMessage} from 'amqplib';
import {rabbitmqSubscribe} from '../decorators/rabbitmq-subscribe.decorator';
import {CategoryRepository} from '../repositories';

@bind({scope: BindingScope.TRANSIENT})
export class CategorySyncService {
  constructor(
    @repository(CategoryRepository) private categoryRepo: CategoryRepository,
  ) {}

  @rabbitmqSubscribe({
    exchange: 'amq.topic',
    queue: 'micro-catalog/sync-category',
    routingKey: 'model.category.*',
  })
  async handler({data, message}: {data: any; message: ConsumeMessage}) {
    const [, event] = message.fields.routingKey.split('.').slice(1);
    console.log(data);

    switch (event) {
      case 'created':
        await this.categoryRepo.create(data);
        break;
      case 'updated':
        await this.categoryRepo.updateById(data.id, data);
        break;
      case 'deleted':
        await this.categoryRepo.deleteById(data.id);
        break;
      default:
        break;
    }
  }
}
