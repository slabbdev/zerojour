// Local deterministic tool handed to the agent alongside the Sanity Context
// MCP tools. GROQ compares version strings lexicographically ("1.10.0" <
// "1.9.0" as strings), so version-range checks must not happen in the query —
// they happen here, with a real semver implementation.

import semver from 'semver'
import type {OpenAITool} from './llm.ts'

export const versionInRangeTool: OpenAITool = {
  type: 'function',
  function: {
    name: 'version_in_range',
    description:
      'Check whether a package version falls in an advisory range. Semantics follow the GitHub Advisory Database: introduced is inclusive, fixed is exclusive, lastAffected is inclusive.',
    parameters: {
      type: 'object',
      properties: {
        version: {type: 'string', description: 'The version to test, e.g. "1.2.0"'},
        introduced: {type: 'string', description: 'First affected version (inclusive)'},
        fixed: {type: 'string', description: 'First fixed version (exclusive)'},
        lastAffected: {type: 'string', description: 'Last affected version (inclusive)'},
      },
      required: ['version'],
    },
  },
}

export function versionInRange(args: {
  version: string
  introduced?: string | null
  fixed?: string | null
  lastAffected?: string | null
}): boolean {
  const v = semver.coerce(args.version)
  if (!v) return false
  const introduced = args.introduced ? semver.coerce(args.introduced) : null
  const fixed = args.fixed ? semver.coerce(args.fixed) : null
  const lastAffected = args.lastAffected ? semver.coerce(args.lastAffected) : null
  if (introduced && semver.lt(v, introduced)) return false
  if (fixed && !semver.lt(v, fixed)) return false
  if (lastAffected && semver.gt(v, lastAffected)) return false
  return true
}
