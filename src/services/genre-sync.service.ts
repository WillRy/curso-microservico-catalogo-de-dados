import {bind, /* inject, */ BindingScope} from '@loopback/core';
import {repository} from '@loopback/repository';
import {GenreRepository} from '../repositories';
import {rabbitmqSubscribe} from '../decorators/rabbitmq-subscribe.decorator';
import {ConsumeMessage} from 'amqplib';

@bind({scope: BindingScope.TRANSIENT})
export class GenreSyncService {
  constructor(
    @repository(GenreRepository) private genreRepo: GenreRepository,
  ) {}

  @rabbitmqSubscribe({
    exchange: 'amq.topic',
    queue: 'micro-catalog/sync-gente',
    routingKey: 'model.genre.*',
  })
  async handler({data, message}: {data: any; message: ConsumeMessage}) {
    const [, event] = message.fields.routingKey.split('.').slice(1);
    console.log(data);

    switch (event) {
      case 'created':
        await this.genreRepo.create(data);
        break;
      case 'updated':
        await this.genreRepo.updateById(data.id, data);
        break;
      case 'deleted':
        await this.genreRepo.deleteById(data.id);
        break;
      default:
        break;
    }
  }
}
