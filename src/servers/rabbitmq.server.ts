import {Context} from '@loopback/context';
import {Server} from '@loopback/core';
import {connect, Connection} from 'amqplib';

export class RabbitmqServer extends Context implements Server {
  private _listening: boolean;
  conn: Connection;
  async start(): Promise<void> {
    this.conn = await connect({
      hostname: 'rabbitmq',
      username: 'admin',
      password: 'admin',
    });
    this._listening = true;
  }
  async stop(): Promise<void> {
    await this.conn.close();
    this._listening = false;
  }

  get listening(): boolean {
    return this._listening;
  }
}
