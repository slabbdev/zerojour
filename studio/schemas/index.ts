import type {SchemaTypeDefinition} from 'sanity'
import advisory from './advisory'
import cwe from './cwe'
import playbook from './playbook'
import product from './product'

export const schemaTypes: SchemaTypeDefinition[] = [advisory, product, cwe, playbook]
