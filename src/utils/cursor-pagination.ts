import { Document, FilterQuery, Model, Query } from 'mongoose';

export function buildPaginator<Entity extends Document>(
  options: PaginationOptions<Entity>,
): Paginator<Entity> {
  const { model, query = {}, paginationKeys = ['_id' as any] } = options;

  const paginator = new Paginator(model, paginationKeys);

  if (query.afterCursor) {
    paginator.setAfterCursor(query.afterCursor);
  }

  if (query.beforeCursor) {
    paginator.setBeforeCursor(query.beforeCursor);
  }

  if (query.limit) {
    paginator.setLimit(query.limit);
  }

  if (query.order) {
    paginator.setOrder(query.order as Order);
  }

  return paginator;
}

export default class Paginator<Entity extends Document> {
  private afterCursor: string | null = null;
  private beforeCursor: string | null = null;
  private nextAfterCursor: string | null = null;
  private nextBeforeCursor: string | null = null;
  private limit = 100;
  private order: Order = Order.DESC;

  public constructor(
    private model: Model<Entity>,
    private paginationKeys: Extract<keyof Entity, string>[],
  ) {}

  public setAfterCursor(cursor: string): void {
    this.afterCursor = cursor;
  }

  public setBeforeCursor(cursor: string): void {
    this.beforeCursor = cursor;
  }

  public setLimit(limit: number): void {
    this.limit = limit;
  }

  public setOrder(order: Order): void {
    this.order = order;
  }

  public async paginate(
    filter: FilterQuery<Entity> = {},
    options?: {
      populate?: string | string[];
      select?: string;
    },
  ): Promise<PagingResult<Entity>> {
    const query = this.buildQuery(filter, options);
    const entities = await query.exec();
    const hasMore = entities.length > this.limit;

    const totalCount = await this.model.countDocuments(filter).exec();

    if (hasMore) {
      entities.splice(entities.length - 1, 1);
    }

    if (entities.length === 0) {
      return this.toPagingResult(entities, totalCount);
    }

    if (!this.hasAfterCursor() && this.hasBeforeCursor()) {
      entities.reverse();
    }

    if (this.hasBeforeCursor() || hasMore) {
      this.nextAfterCursor = this.encode(entities[entities.length - 1]);
    }

    if (this.hasAfterCursor() || (hasMore && this.hasBeforeCursor())) {
      this.nextBeforeCursor = this.encode(entities[0]);
    }

    return this.toPagingResult(entities, totalCount);
  }

  private buildQuery(
    filter: FilterQuery<Entity>,
    options?: {
      populate?: string | string[];
      select?: string;
    },
  ): Query<Entity[], Entity> {
    const cursors: CursorParam = {};
    let query = this.model.find(filter);

    // Apply cursor filters
    if (this.hasAfterCursor()) {
      Object.assign(cursors, this.decode(this.afterCursor as string));
    } else if (this.hasBeforeCursor()) {
      Object.assign(cursors, this.decode(this.beforeCursor as string));
    }

    if (Object.keys(cursors).length > 0) {
      const cursorFilter = this.buildCursorFilter(cursors);
      query = query.find(cursorFilter);
    }

    // Apply limit (fetch one extra to check for more results)
    query = query.limit(this.limit + 1);

    // Apply sorting
    const sortObject = this.buildSort();
    query = query.sort(sortObject);

    // Apply population if provided
    if (options?.populate) {
      if (Array.isArray(options.populate)) {
        options.populate.forEach((path) => {
          query = query.populate(path);
        });
      } else {
        query = query.populate(options.populate);
      }
    }

    // Apply field selection if provided
    if (options?.select) {
      query = query.select(options.select);
    }

    return query;
  }

  private buildCursorFilter(cursors: CursorParam): FilterQuery<Entity> {
    const operator = this.getOperator();
    const orConditions: any[] = [];

    // Build progressive conditions for cursor-based pagination
    const accumulatedConditions: any = {};

    for (let i = 0; i < this.paginationKeys.length; i++) {
      const key = this.paginationKeys[i];
      const value = cursors[key];

      if (value === undefined) continue;

      const condition: any = { ...accumulatedConditions };

      // Add the comparison for current key
      if (operator === '>') {
        condition[key] = { $gt: value };
      } else if (operator === '<') {
        condition[key] = { $lt: value };
      } else {
        condition[key] = value;
      }

      orConditions.push(condition);

      // Prepare accumulated conditions for next iteration
      accumulatedConditions[key] = value;
    }

    return orConditions.length > 0 ? { $or: orConditions } : {};
  }

  private getOperator(): string {
    if (this.hasAfterCursor()) {
      return this.order === Order.ASC ? '>' : '<';
    }

    if (this.hasBeforeCursor()) {
      return this.order === Order.ASC ? '<' : '>';
    }

    return '=';
  }

  private buildSort(): Record<string, 1 | -1> {
    let { order } = this;

    if (!this.hasAfterCursor() && this.hasBeforeCursor()) {
      order = this.flipOrder(order);
    }

    const sortObject: Record<string, 1 | -1> = {};
    this.paginationKeys.forEach((key) => {
      sortObject[key as string] = order === Order.ASC ? 1 : -1;
    });

    return sortObject;
  }

  private hasAfterCursor(): boolean {
    return this.afterCursor !== null;
  }

  private hasBeforeCursor(): boolean {
    return this.beforeCursor !== null;
  }

  private encode(entity: Entity): string {
    const payload = this.paginationKeys
      .map((key) => {
        const type = this.getSchemaType(key as string);
        const value = encodeByType(type, entity[key]);
        return `${key as string}:${value}`;
      })
      .join(',');

    return btoa(payload);
  }

  private decode(cursor: string): CursorParam {
    const cursors: CursorParam = {};
    const columns = atob(cursor).split(',');
    columns.forEach((column) => {
      const [key, raw] = column.split(':');
      const type = this.getSchemaType(key);
      const value = decodeByType(type, raw);
      cursors[key] = value;
    });

    return cursors;
  }

  private getSchemaType(key: string): string {
    const schemaType = this.model.schema.paths[key];
    if (!schemaType) {
      return 'string'; // default fallback
    }

    const typeName = schemaType.constructor.name.toLowerCase();

    // Map Mongoose schema types to our encoding types
    switch (typeName) {
      case 'objectid':
        return 'objectid';
      case 'date':
        return 'date';
      case 'number':
        return 'number';
      case 'string':
        return 'string';
      default:
        return 'string';
    }
  }

  private flipOrder(order: Order): Order {
    return order === Order.ASC ? Order.DESC : Order.ASC;
  }

  private getCursor(): Cursor {
    return {
      afterCursor: this.nextAfterCursor,
      beforeCursor: this.nextBeforeCursor,
    };
  }

  private toPagingResult<Entity>(
    entities: Entity[],
    totalCount: number,
  ): PagingResult<Entity> {
    return {
      data: entities,
      cursor: this.getCursor(),
      totalCount,
    };
  }
}

// Types and interfaces
export interface PagingQuery {
  afterCursor?: string;
  beforeCursor?: string;
  limit?: number;
  order?: Order | 'ASC' | 'DESC';
}

export interface PaginationOptions<Entity extends Document> {
  model: Model<Entity>;
  query?: PagingQuery;
  paginationKeys?: Extract<keyof Entity, string>[];
}

export interface CursorParam {
  [key: string]: any;
}

export interface Cursor {
  beforeCursor: string | null;
  afterCursor: string | null;
}

export interface PagingResult<Entity> {
  data: Entity[];
  cursor: Cursor;
  totalCount: number;
}

export enum Order {
  ASC = 'ASC',
  DESC = 'DESC',
}

// Utility functions
function atob(value: string): string {
  return Buffer.from(value, 'base64').toString();
}

function btoa(value: string): string {
  return Buffer.from(value).toString('base64');
}

function encodeByType(type: string, value: any): string | null {
  if (value === null || value === undefined) return null;

  switch (type) {
    case 'date': {
      return (value as Date).getTime().toString();
    }
    case 'number': {
      return `${value}`;
    }
    case 'string': {
      return encodeURIComponent(value);
    }
    case 'objectid': {
      return value.toString();
    }
    case 'object': {
      if (typeof value.getTime === 'function') {
        return (value as Date).getTime().toString();
      }
      if (typeof value.toString === 'function') {
        return value.toString();
      }
      break;
    }
    default:
      break;
  }

  throw new Error(`unknown type in cursor: [${type}]${value}`);
}

function decodeByType(type: string, value: string): string | number | Date {
  switch (type) {
    case 'objectid':
    case 'string': {
      return decodeURIComponent(value);
    }
    case 'date': {
      const timestamp = parseInt(value, 10);
      if (Number.isNaN(timestamp)) {
        throw new Error('date column in cursor should be a valid timestamp');
      }
      return new Date(timestamp);
    }
    case 'number': {
      const num = parseFloat(value);
      if (Number.isNaN(num)) {
        throw new Error('number column in cursor should be a valid number');
      }
      return num;
    }
    case 'object': {
      if (typeof value.toString === 'function') {
        return value.toString();
      }
      break;
    }
    default: {
      throw new Error(`unknown type in cursor: [${type}]${value}`);
    }
  }
}
