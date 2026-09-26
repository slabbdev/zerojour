import {defineArrayMember, defineField, defineType} from 'sanity'

const impact = ['NONE', 'LOW', 'HIGH'] as const

export default defineType({
  name: 'advisory',
  title: 'Advisory',
  type: 'document',
  fields: [
    defineField({name: 'ghsaId', title: 'GHSA ID', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'cveId', title: 'CVE ID', type: 'string'}),
    defineField({name: 'title', title: 'Title', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'summary', title: 'Summary', type: 'text', rows: 3}),
    defineField({name: 'details', title: 'Details', type: 'text', rows: 6}),
    defineField({
      name: 'product',
      title: 'Affected product',
      type: 'reference',
      to: [{type: 'product'}],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'affectedVersions',
      title: 'Affected version ranges',
      description: 'Ranges exactly as published; agents intersect them client-side (semver), GROQ cannot compare versions reliably.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({name: 'introduced', title: 'Introduced (inclusive)', type: 'string'}),
            defineField({name: 'fixed', title: 'Fixed (exclusive)', type: 'string'}),
            defineField({name: 'lastAffected', title: 'Last affected (inclusive)', type: 'string'}),
          ],
          preview: {
            select: {title: 'introduced', subtitle: 'fixed'},
          },
        }),
      ],
    }),
    defineField({
      name: 'severity',
      title: 'Severity (CVSS)',
      type: 'object',
      fields: [
        defineField({name: 'baseScore', title: 'Base score (official, from the advisory database)', type: 'number'}),
        defineField({name: 'vector', title: 'Vector string', type: 'string'}),
        defineField({
          name: 'components',
          title: 'Components (parsed from the vector, so agents can query each one)',
          type: 'object',
          fields: [
            defineField({name: 'attackVector', type: 'string', options: {list: ['NETWORK', 'ADJACENT_NETWORK', 'LOCAL', 'PHYSICAL']}}),
            defineField({name: 'attackComplexity', type: 'string', options: {list: ['LOW', 'HIGH']}}),
            defineField({name: 'privilegesRequired', type: 'string', options: {list: ['NONE', 'LOW', 'HIGH']}}),
            defineField({name: 'userInteraction', type: 'string', options: {list: ['NONE', 'REQUIRED']}}),
            defineField({name: 'scope', type: 'string', options: {list: ['UNCHANGED', 'CHANGED']}}),
            defineField({name: 'confidentialityImpact', type: 'string', options: {list: impact}}),
            defineField({name: 'integrityImpact', type: 'string', options: {list: impact}}),
            defineField({name: 'availabilityImpact', type: 'string', options: {list: impact}}),
          ],
        }),
      ],
    }),
    defineField({
      name: 'cwe',
      title: 'Weaknesses (CWE)',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'cwe'}]})],
    }),
    defineField({
      name: 'exploitMaturity',
      title: 'Exploit maturity',
      description: "'known_exploited' comes from the CISA KEV catalog; 'unknown' means no authoritative signal — never guessed.",
      type: 'string',
      options: {list: ['unknown', 'poc', 'known_exploited']},
      initialValue: 'unknown',
    }),
    defineField({
      name: 'fix',
      title: 'Fix status',
      type: 'object',
      fields: [
        defineField({name: 'status', type: 'string', options: {list: ['fixed', 'workaround_available', 'no_fix']}}),
        defineField({name: 'fixedVersion', title: 'First patched version', type: 'string'}),
        defineField({name: 'workaround', title: 'Workaround', type: 'text'}),
      ],
    }),
    defineField({name: 'published', title: 'Published', type: 'datetime'}),
    defineField({name: 'modified', title: 'Last modified', type: 'datetime'}),
    defineField({name: 'sourceUrl', title: 'Source URL', type: 'url'}),
  ],
  preview: {
    select: {title: 'ghsaId', subtitle: 'title', media: ''},
  },
})
