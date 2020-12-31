# CodeFlix - Microserviço: Catalogo

Este microserviço está sendo desenvolvido no curso: (Ainda em andamento)

**Desenvolvimento de Aplicações Modernas e Escaláveis com Microserviços** da **Code Education**

O projeto como um todo contendo todos os microserviços, tem como objetivo compor uma aplicação de streaming de vídeo.

A Aplicação funciona através dos seguintes microserviços:

- Catalogo/Admin: Responsável pelo cadastro de categorias/gêneros e videos, centralizando o upload dos vídeos.

  - repositório: https://github.com/WillRy/curso-microservico-catalogo-de-videos

- Encoder de vídeo: Responsável por receber as informações dos uploads e realizar a conversão dos videos para um formato mais
  adequado para stream, o mpegdash.

  - repositório: https://github.com/WillRy/curso-microservico-encoder-de-videos

- Catalogo: Responsável por receber as informações dos cadastros e indexar os dados no ElasticSearch.

  - repositório: https://github.com/WillRy/curso-microservico-catalogo-de-dados

- Autenticação: Serviço feito com base no KeyCloack, para realizar a autenticação SSO/OpenID/OAuth2

- RabbitMQ: Serviço de mensageria AMQP para comunicar os microserviços.
  - repositório: https://github.com/WillRy/curso-microservico-rabbitmq

## Microserviço do repositório - Catalogo

Responsável por receber as informações dos cadastros e indexar os dados no ElasticSearch.
Os dados são recebidos através do RabbitMQ e em seguidas são indexados no ES.

Os dados indexados são:

- Videos
- Membros de elenco
- Generos e Categorias

Este microserviço é composto por:

- **Backend:**
  API REST desenvolvida com Loopback(Node.JS)

## Endpoints da API

Os endpoints da API estão na URL: http://localhost:3000/explorer

## Como executar

- Clone o repositório

```shell
git clone https://github.com/WillRy/curso-microservico-catalogo-de-dados
```

- Clone o repositório do RabbitMQ

```shell
git clone https://github.com/WillRy/curso-microservico-rabbitmq
```

- Execute com docker o RabbitMQ

```shell
cd curso-microservico-rabbitmq

#essa rede será utilizada pelos outros docker-composes para se comunicar com o RabbitMQ
sh ./docker-network.sh

docker-compose up -d
```

- Execute o ambiente completo

```shell
cd curso-microservico-catalogo-de-dados

docker-compose up -d

```
