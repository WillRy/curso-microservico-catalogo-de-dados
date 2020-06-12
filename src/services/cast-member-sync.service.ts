import {bind, /* inject, */ BindingScope} from '@loopback/core';
import {repository} from '@loopback/repository';
import {ConsumeMessage} from 'amqplib';
import {rabbitmqSubscribe} from '../decorators/rabbitmq-subscribe.decorator';
import {CastMemberRepository} from '../repositories/cast-member.repository';

@bind({scope: BindingScope.TRANSIENT})
export class CastMemberSyncService {
  constructor(
    @repository(CastMemberRepository)
    private castMemberRepo: CastMemberRepository,
  ) {}

  @rabbitmqSubscribe({
    exchange: 'amq.topic',
    queue: 'micro-catalog/sync-cast-member',
    routingKey: 'model.cast-member.*',
  })
  async handler({data, message}: {data: any; message: ConsumeMessage}) {
    const [, event] = message.fields.routingKey.split('.').slice(1);
    console.log(data);

    switch (event) {
      case 'created':
        await this.castMemberRepo.create(data);
        break;
      case 'updated':
        await this.castMemberRepo.updateById(data.id, data);
        break;
      case 'deleted':
        await this.castMemberRepo.deleteById(data.id);
        break;
      default:
        break;
    }
  }
}
