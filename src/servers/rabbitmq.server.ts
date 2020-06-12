import {Binding, Context, inject, MetadataInspector} from '@loopback/context';
import {Application, CoreBindings, Server} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  AmqpConnectionManager,
  AmqpConnectionManagerOptions,
  ChannelWrapper,
  connect,
} from 'amqp-connection-manager';
import {Channel, ConfirmChannel, Options} from 'amqplib';
import {
  RabbitmqSubscribeMetadata,
  RABBITMQ_SUBSCRIBE_DECORATOR,
} from '../decorators/rabbitmq-subscribe.decorator';
import {RabbitmqBindings} from '../keys';
import {CategoryRepository} from '../repositories';

export interface RabbitmqConfig {
  uri: string;
  connOptions?: AmqpConnectionManagerOptions;
  exchanges?: {name: string; type: string; options?: Options.AssertExchange}[];
}

export class RabbitmqServer extends Context implements Server {
  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE) private app: Application,
    @repository(CategoryRepository) private categoryRepo: CategoryRepository,
    @inject(RabbitmqBindings.CONFIG) private config: RabbitmqConfig,
  ) {
    //injeta contexto pai, neste context (cada server tem um context)
    super(app);
    console.log('uri', config);
  }

  private _listening: boolean;
  private _conn: AmqpConnectionManager;
  private _channelManager: ChannelWrapper;
  channel: Channel;

  async start(): Promise<void> {
    this._conn = connect([this.config.uri], this.config.connOptions);
    this._channelManager = this.conn.createChannel();
    this.channelManager.on('connect', () => {
      this._listening = true;
      console.log('Successfully connected a RabbitMQ channel');
    });
    this.channelManager.on('error', (err, {name}) => {
      this._listening = false;
      console.log(
        `Fail to setup a RabbitMQ channel - name:${name} | error:${err}`,
      );
    });
    await this.setupExchanges();
    await this.bindSubscribers();
  }

  private async setupExchanges() {
    //retorna promise para ser resolvida
    return this.channelManager.addSetup(async (channel: ConfirmChannel) => {
      if (!this.config.exchanges) {
        return;
      }

      //cria todas as exchanges de forma assincrona, em paralelo
      await Promise.all(
        this.config.exchanges.map(exchange =>
          channel.assertExchange(
            exchange.name,
            exchange.type,
            exchange.options,
          ),
        ),
      );
    });
  }

  private async bindSubscribers() {
    const subscribers = this.getSubscribers();
    subscribers.map(async item => {
      await this.channelManager.addSetup(async (channel: ConfirmChannel) => {
        const {exchange, routingKey, queue, queueOptions} = item.metadata;
        const assertQueue = await channel.assertQueue(
          queue ?? '',
          queueOptions ?? undefined,
        );

        const routingKeys = Array.isArray(routingKey)
          ? routingKey
          : [routingKey];

        await Promise.all(
          routingKeys.map(routing =>
            channel.bindQueue(assertQueue.queue, exchange, routing),
          ),
        );

        await this.consume({
          channel,
          queue: assertQueue.queue,
          method: item.method,
        });
      });
    });
  }

  private getSubscribers(): {
    method: Function;
    metadata: RabbitmqSubscribeMetadata;
  }[] {
    //busca todos os services
    const bindings: Array<Readonly<Binding>> = this.find('services.*');

    return bindings
      .map(binding => {
        const metadata = MetadataInspector.getAllMethodMetadata<
          RabbitmqSubscribeMetadata
        >(RABBITMQ_SUBSCRIBE_DECORATOR, binding.valueConstructor?.prototype);

        if (!metadata) {
          return [];
        }
        const methods = [];

        //para cada metadado do servico, pego o metodo e os seus metadados
        for (const methodName in metadata) {
          if (!Object.prototype.hasOwnProperty.call(metadata, methodName)) {
            return;
          }

          const service = this.getSync(binding.key) as any;

          //este binding existe para que não perca a referencia do this,
          //dentro do service
          methods.push({
            method: service[methodName].bind(service),
            metadata: metadata[methodName],
          });
        }

        return methods;
      })
      .reduce((collection: any, item: any) => {
        collection.push(...item);
        return collection;
      }, []);
  }

  private async consume({
    channel,
    queue,
    method,
  }: {
    channel: ConfirmChannel;
    queue: string;
    method: Function;
  }) {
    await channel.consume(queue, async message => {
      try {
        if (!message) throw new Error('Received null message');

        const content = message.content;
        if (content) {
          let data;
          try {
            data = JSON.parse(content.toString());
          } catch (error) {
            data = null;
          }
          console.log(data);
          await method({data, message, channel});
          channel.ack(message);
        }
      } catch (e) {
        console.log(e);
        // Definir politica de resposta
      }
    });
  }

  async stop(): Promise<void> {
    await this.conn.close();
    this._listening = false;
  }

  get listening(): boolean {
    return this._listening;
  }

  get conn(): AmqpConnectionManager {
    return this._conn;
  }

  get channelManager(): ChannelWrapper {
    return this._channelManager;
  }
}
