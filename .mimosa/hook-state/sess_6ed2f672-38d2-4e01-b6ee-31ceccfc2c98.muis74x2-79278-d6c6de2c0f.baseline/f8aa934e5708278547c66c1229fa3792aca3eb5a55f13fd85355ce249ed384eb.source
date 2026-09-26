import {defineArrayMember, defineField, defineType} from 'sanity'

// Prose remediation notes per product — this is the material the Sanity
// Knowledge Base indexes, complementing the structured advisory fields.
export default defineType({
  name: 'playbook',
  title: 'Remediation Playbook',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'product',
      title: 'Product',
      type: 'reference',
      to: [{type: 'product'}],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [defineArrayMember({type: 'block'})],
    }),
    defineField({name: 'lastReviewed', title: 'Last reviewed', type: 'date'}),
  ],
  preview: {
    select: {title: 'title', subtitle: 'lastReviewed'},
  },
})
