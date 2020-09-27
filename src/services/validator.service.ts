import {bind, BindingScope, inject} from '@loopback/core';
import {Entity} from '@loopback/repository';
import {
  AjvFactory,
  getModelSchemaRef,
  RestBindings,
  validateRequestBody,
} from '@loopback/rest';

interface ValidateOptions<T> {
  data: any;
  entityClass: Function & {prototype: T};
}

@bind({scope: BindingScope.SINGLETON})
export class ValidatorService {
  cache = new Map();

  constructor(
    @inject(RestBindings.AJV_FACTORY) private ajvFactory: AjvFactory,
  ) {}

  async validate<T extends object>({data, entityClass}: ValidateOptions<T>) {
    const modelSchema = getModelSchemaRef(entityClass);

    if (!modelSchema) {
      const error = new Error('The parameter entityClass is not a entity');
      error.name = 'NotEntityClass';
      throw error;
    }

    const schemaRef = {$ref: modelSchema.$ref};

    const schemaName = Object.keys(modelSchema.definitions)[0];

    if (!this.cache.has(schemaName)) {
      this.cache.set(schemaName, modelSchema.definitions[schemaName]);
    }

    const globalSchemas = Array.from(this.cache).reduce<any>(
      (obj, [key, value]) => {
        obj[key] = value;
        return obj;
      },
      {},
    );

    await validateRequestBody(
      {value: data, schema: schemaRef},
      {required: true, content: {}},
      modelSchema.definitions,
      {
        ajvFactory: this.ajvFactory,
      },
    );
  }
}
