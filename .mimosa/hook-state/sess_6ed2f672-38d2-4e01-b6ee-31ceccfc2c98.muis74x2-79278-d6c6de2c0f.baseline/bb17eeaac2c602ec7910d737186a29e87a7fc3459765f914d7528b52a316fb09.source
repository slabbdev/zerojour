import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    defineField({name: 'name', title: 'Package name', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'vendor', title: 'Vendor / maintainer', type: 'string'}),
    defineField({
      name: 'ecosystem',
      title: 'Ecosystem',
      type: 'string',
      options: {list: ['npm', 'pip', 'go', 'maven', 'rubygems', 'crates.io']},
      validation: (r) => r.required(),
    }),
    defineField({name: 'repoUrl', title: 'Repository', type: 'url'}),
    defineField({name: 'description', title: 'Description', type: 'text', rows: 3}),
  ],
  preview: {
    select: {title: 'name', subtitle: 'ecosystem'},
  },
})
