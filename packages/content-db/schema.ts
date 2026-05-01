import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

export const producers = sqliteTable(
  'producers',
  {
    slug: text('slug').primaryKey(),
    category: text('category').notNull(), // 'wine' | 'coffee' | 'delicacies'
    name: text('name').notNull(),
    region: text('region').notNull(),
    country: text('country').notNull(),
    founded: integer('founded'),
    shortStory: text('short_story'),
    story: text('story'),
    philosophy: text('philosophy'),
    estateInfo: text('estate_info'), // JSON: [{name, hectares, soil}] (wine) | [{name, altitude, variety}] (coffee)
    images: text('images'),          // JSON: [{url, caption}]
    website: text('website'),
    updatedAt: integer('updated_at').notNull(),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    index('producers_category').on(t.category),
    index('producers_region').on(t.region),
    index('producers_country').on(t.country),
  ]
)

export const productContent = sqliteTable(
  'product_content',
  {
    sku: text('sku').primaryKey(),
    category: text('category').notNull(), // 'wine' | 'coffee' | 'delicacies'
    producerSlug: text('producer_slug').references(() => producers.slug),

    awards: text('awards'),       // JSON: [{name, year, rank}]
    pairing: text('pairing'),     // JSON: [{dish, note}]
    ritual: text('ritual'),       // markdown
    servingTemp: text('serving_temp'),

    // JSON blob, dimensions per category:
    // wine:       {body, sweetness, acidity, tannin, alcohol}
    // coffee:     {acidity, body, sweetness, roast, bitterness}
    // delicacies: {intensity, saltiness, sweetness, umami}
    profile: text('profile'),

    // JSON blob, markdown per dimension:
    // wine:       {eye, nose, palate}
    // coffee:     {aroma, taste, aftertaste}
    // delicacies: {aroma, taste, texture}
    sensory: text('sensory'),

    // JSON blob, category-specific extras:
    // wine:       {decanting, color, style}
    // coffee:     {processing, variety, brew_methods}
    // delicacies: {ingredients, storage, origin_story}
    extended: text('extended'),

    // Full category-specific wine details JSON edited by admin.
    wineDetails: text('wine_details'),

    hasAwards: integer('has_awards').notNull().default(0),
    isPublished: integer('is_published').notNull().default(0),

    updatedAt: integer('updated_at').notNull(),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    index('pc_category').on(t.category),
    index('pc_producer').on(t.producerSlug),
    index('pc_published').on(t.isPublished),
    index('pc_category_published').on(t.category, t.isPublished),
  ]
)

export const productContentHistory = sqliteTable(
  'product_content_history',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sku: text('sku').notNull(),
    payload: text('payload').notNull(), // full JSON snapshot
    changedBy: integer('changed_by'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('pch_sku_created').on(t.sku, t.createdAt),
  ]
)

export const dishTemplates = sqliteTable(
  'dish_templates',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    category: text('category').notNull().default('wine'),
    name: text('name').notNull(),
    note: text('note'),
    dishType: text('dish_type'),
    imageUrl: text('image_url'),
    emoji: text('emoji'),
    tags: text('tags'),
    isActive: integer('is_active').notNull().default(1),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('dt_category').on(t.category),
    index('dt_active').on(t.isActive),
    index('dt_dish_type').on(t.dishType),
  ]
)

export const producersHistory = sqliteTable(
  'producers_history',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull(),
    payload: text('payload').notNull(),
    changedBy: integer('changed_by'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('prh_slug_created').on(t.slug, t.createdAt),
  ]
)

export const producersRelations = relations(producers, ({ many }) => ({
  products: many(productContent),
}))

export const productContentRelations = relations(productContent, ({ one }) => ({
  producer: one(producers, {
    fields: [productContent.producerSlug],
    references: [producers.slug],
  }),
}))
