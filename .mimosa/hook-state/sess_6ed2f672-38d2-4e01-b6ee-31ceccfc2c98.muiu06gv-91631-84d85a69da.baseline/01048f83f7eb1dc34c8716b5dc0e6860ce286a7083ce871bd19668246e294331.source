import {defineArrayMember, defineField, defineType} from 'sanity'

// The editorial workflow document — the challenge's "Workflows" bonus, made
// concrete: draft (machine-composed) -> review (human) -> published. The
// state field is the workflow; the API route is its only mover, and the
// publish step is a human signature, never the composer's.
export default defineType({
  name: 'pressArticle',
  title: 'Press Article',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Headline', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'basedOn',
      title: 'Based on advisory',
      type: 'reference',
      to: [{type: 'advisory'}],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'state',
      title: 'Workflow state',
      type: 'string',
      options: {list: ['draft', 'review', 'published']},
      initialValue: 'draft',
      validation: (r) => r.required(),
    }),
    defineField({name: 'byline', title: 'Byline', type: 'string'}),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [defineArrayMember({type: 'block'})],
    }),
    defineField({name: 'publishedAt', title: 'Published at', type: 'datetime'}),
  ],
  preview: {
    select: {title: 'title', subtitle: 'state'},
  },
})
