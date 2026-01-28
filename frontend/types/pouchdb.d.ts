
import * as PouchDB from 'pouchdb';

declare module 'pouchdb' {
  namespace Find {
    interface ConditionOperators {
      $eq?: any;
      $gt?: any;
      $gte?: any;
      $lt?: any;
      $lte?: any;
      $ne?: any;
      $in?: any[];
      $nin?: any[];
      $all?: any[];
      $size?: number;
      $regex?: RegExp;
      $exists?: boolean;
      $mod?: number[];
      [operator: string]: any;
    }

    interface Selector {
      [field: string]: Selector | ConditionOperators | any;
    }

    interface FindRequest {
      selector: Selector;
      fields?: string[];
      sort?: Array<string | { [propName: string]: 'asc' | 'desc' }>;
      limit?: number;
      skip?: number;
      use_index?: string | [string, string];
    }

    interface FindResponse<Content extends {}> {
      docs: Content[];
      warning?: string;
    }

    interface CreateIndexOptions {
      index: {
        fields: string[];
        name?: string;
        ddoc?: string;
        type?: string;
      };
    }

    interface CreateIndexResponse<Content extends {}> {
      result: string;
    }

    interface GetIndexesResponse<Content extends {}> {
      indexes: Index[];
    }

    interface DeleteIndexOptions {
      index: Index;
    }

    interface DeleteIndexResponse<Content extends {}> {
      ok: boolean;
    }

    interface Index {
      ddoc: string | null;
      name: string;
      type: string;
      def: {
        fields: Array<{ [key: string]: string }>;
      };
    }
  }

  interface Database<Content extends {} = {}> {
    find(request: Find.FindRequest): Promise<Find.FindResponse<Content>>;
    createIndex(index: Find.CreateIndexOptions): Promise<Find.CreateIndexResponse<Content>>;
    getIndexes(): Promise<Find.GetIndexesResponse<Content>>;
    deleteIndex(index: Find.DeleteIndexOptions): Promise<Find.DeleteIndexResponse<Content>>;
  }
}

declare module 'pouchdb-find' {
  const plugin: PouchDB.Plugin;
  export default plugin;
}
