import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'cwe',
  title: 'CWE',
  type: 'document',
  fields: [
    defineField({name: 'cweId', title: 'CWE ID', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'name', title: 'Official name', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'abstraction',
      title: 'Abstraction level',
      type: 'string',
      options: {list: ['Pillar', 'Class', 'Base', 'Variant', 'Compound']},
    }),
    defineField({name: 'description', title: 'Description', type: 'text', rows: 4}),
  ],
  preview: {
    select: {title: 'cweId', subtitle: 'name'},
  },
})
