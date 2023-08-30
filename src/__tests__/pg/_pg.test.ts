import { describe, expect, it } from 'vitest';
import {
  bigint,
  bigserial,
  boolean,
  char,
  date,
  doublePrecision,
  foreignKey,
  index,
  integer,
  interval,
  json,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  smallint,
  smallserial,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  varchar
} from 'drizzle-orm/pg-core';
import { compareWith } from '../utils';
import { pgGenerator } from '~/generators';
import { PgSchema } from '~/types';
import { relations } from 'drizzle-orm';

function typesTest() {
  const myEnum = pgEnum('my_enum', ['value_1', 'value_2', 'value_3']);
  
  const myTable = pgTable('my_table', {
    integer: integer('integer'),
    smallint: smallint('smallint'),
    bigint: bigint('bigint', { mode: 'bigint' }),
    serial: serial('serial'),
    smallserial: smallserial('smallserial'),
    bigserial: bigserial('bigserial', { mode: 'bigint' }),
    boolean: boolean('boolean'),
    text: text('text'),
    varchar: varchar('varchar'),
    char: char('char'),
    numeric: numeric('numeric'),
    real: real('real'),
    doublePrecision: doublePrecision('double_precision'),
    json: json('json'),
    jsonb: jsonb('jsonb'),
    time: time('time'),
    timestamp: timestamp('timestamp'),
    timestampP3: timestamp('timestamp_p3', { precision: 3 }),
    timestampWT: timestamp('timestamp_wt', { withTimezone: true }),
    date: date('date'),
    interval: interval('interval'),
    intervalDay: interval('interval_day', { fields: 'day' }),
    intervalP3: interval('interval_p3', { precision: 3 }),
    anEnum: myEnum('an_enum'),
    intArr: integer('int_arr').array(),
    int2dArr: integer('int_2d_arr').array(3).array()
  });
  const schema = { myEnum, myTable } as unknown as PgSchema;
  const generated = pgGenerator(schema);
  expect(compareWith(generated, './pg/types.dbml')).toBe(true);
}

function constraintsTest() {
  const myTable = pgTable('my_table', {
    pk: integer('pk').primaryKey(),
    nn: integer('nn').notNull(),
    u: integer('u').unique(),
    defaultS: text('default_s').default('some text'),
    defaultN: integer('default_n').default(1),
    defaultNow: timestamp('default_now').defaultNow(),
    defaultA: integer('default_a').array().default([1, 2, 3]),
    ai: serial('ai'),
    multiple: text('multiple').notNull().default('other text')
  });

  const schema = { myTable } as unknown as PgSchema;
  const generated = pgGenerator(schema);
  expect(compareWith(generated, './pg/constraints.dbml')).toBe(true);
}

function inlineFkTest() {
  const users = pgTable('users', {
    id: serial('id').primaryKey()
  });
  const posts = pgTable('posts', {
    id: serial('id').primaryKey(),
    postedById: integer('posted_by_id').notNull().references(() => users.id, {
      onDelete: 'cascade',
      onUpdate: 'no action'
    })
  });

  const schema = { users, posts } as unknown as PgSchema;
  const generated = pgGenerator(schema);
  expect(compareWith(generated, './pg/inline-fk.dbml')).toBe(true);
}

function fkTest() {
  const users = pgTable('users', {
    id: serial('id').primaryKey(),
    registeredAt: timestamp('registered_at'),
    username: text('username')
  });
  const posts = pgTable('posts', {
    id: serial('id').primaryKey(),
    postedByUserRegisteredAt: timestamp('posted_by_user_registered_at'),
    postedBy: text('posted_by')
  }, (tbl) => ({
    fk: foreignKey({
      columns: [tbl.postedBy, tbl.postedByUserRegisteredAt],
      foreignColumns: [users.username, users.registeredAt]
    })
  }));

  const schema = { users, posts } as unknown as PgSchema;
  const generated = pgGenerator(schema);
  expect(compareWith(generated, './pg/fk.dbml')).toBe(true);
}

function indexesTest() {
  const table = pgTable('table', {
    f1: integer('f1'),
    f2: integer('f2'),
    f3: integer('f3'),
    f4: integer('f4')
  }, (tbl) => ({
    compositePk: primaryKey(tbl.f1, tbl.f2),
    unique1: unique('key_1').on(tbl.f1),
    unique2: unique('key_2').on(tbl.f1, tbl.f2),
    unique3: uniqueIndex('key_3').on(tbl.f2),
    index1: index('key_4').on(tbl.f3),
    index2: index('key_5').on(tbl.f3, tbl.f4),
    index3: index().on(tbl.f4)
  }));

  const schema = { table } as unknown as PgSchema;
  const generated = pgGenerator(schema);
  expect(compareWith(generated, './pg/indexes.dbml')).toBe(true);
}

function rqbTest() {
  const users = pgTable('users', {
    id: serial('id').primaryKey(),
    configId: integer('config_id').references(() => userConfig.id, {
      onDelete: 'set null'
    })
  });
  const usersRelations = relations(users, ({ one, many }) => ({
    userConfig: one(userConfig, {
      fields: [users.configId],
      references: [userConfig.id]
    }),
    sells: many(items)
  }));

  const userConfig = pgTable('user_config', {
    id: serial('id').primaryKey()
  });
  const userConfigRelations = relations(userConfig, ({ one }) => ({
    user: one(users)
  }));

  const items = pgTable('items', {
    id: serial('id').primaryKey(),
    soldById: integer('sold_by_id').notNull().references(() => users.id, {
      onDelete: 'cascade'
    })
  });
  const itemsRelations = relations(items, ({ one }) => ({
    soldBy: one(users, {
      fields: [items.soldById],
      references: [users.id]
    })
  }));

  const schema = {
    users,
    usersRelations,
    userConfig,
    userConfigRelations,
    items,
    itemsRelations
  } as unknown as PgSchema;
  const generated = pgGenerator(schema, true);
  expect(compareWith(generated, './pg/relations.dbml')).toBe(true);
}

function realTest() {
  const users = pgTable('users', {
    id: serial('id').primaryKey(),
    registeredAt: timestamp('registered_at').notNull().defaultNow(),
    username: varchar('username', { length: 16 }).notNull().unique('uq_users_username'),
    bio: text('bio'),
    hasBlue: boolean('has_blue').notNull().default(false)
  });
  
  const usersRelations = relations(users, ({ many }) => ({
    followers: many(followers, { relationName: 'user_followers' }),
    following: many(followers, { relationName: 'user_follows' }),
    tweets: many(tweets),
    likes: many(likes)
  }));
  
  const followers = pgTable(
    'followers',
    {
      userId: integer('user_id')
        .notNull()
        .references(() => users.id),
      followsUserId: integer('follows_user_id')
        .notNull()
        .references(() => users.id)
    },
    (followers) => ({
      pk: primaryKey(followers.userId, followers.followsUserId)
    })
  );
  
  const followersRelations = relations(followers, ({ one }) => ({
    user: one(users, {
      fields: [followers.userId],
      references: [users.id],
      relationName: 'user_followers'
    }),
    followsUser: one(users, {
      fields: [followers.followsUserId],
      references: [users.id],
      relationName: 'user_follows'
    })
  }));
  
  const tweets = pgTable('tweets', {
    id: serial('id').primaryKey(),
    postedAt: timestamp('posted_at').notNull().defaultNow(),
    content: text('content').notNull(),
    postedById: integer('posted_by_id')
      .notNull()
      .references(() => users.id)
  });
  
  const tweetsRelations = relations(tweets, ({ one }) => ({
    postedBy: one(users, {
      fields: [tweets.postedById],
      references: [users.id]
    })
  }));
  
  const likes = pgTable(
    'likes',
    {
      likedTweetId: integer('liked_tweet_id')
        .notNull()
        .references(() => tweets.id),
      likedById: integer('liked_by_id')
        .notNull()
        .references(() => users.id)
    },
    (likes) => ({
      pk: primaryKey(likes.likedById, likes.likedTweetId)
    })
  );
  
  const likesRelations = relations(likes, ({ one }) => ({
    likedTweet: one(tweets, {
      fields: [likes.likedTweetId],
      references: [tweets.id]
    }),
    likedBy: one(users, {
      fields: [likes.likedById],
      references: [users.id]
    })
  }));

  const schema = { users, usersRelations, followers, followersRelations, tweets, tweetsRelations, likes, likesRelations } as unknown as PgSchema;
  const generated = pgGenerator(schema);
  expect(compareWith(generated, './pg/real.dbml')).toBe(true);
}

describe('Postgres dialect tests', () => {
  it('Outputs all native types', typesTest);
  it('Outputs all column constraints', constraintsTest);
  it('Outputs an inline foreign key', inlineFkTest);
  it('Outputs a foreign key', fkTest);
  it('Outputs all indexes', indexesTest);
  it('Outputs relations written with the RQB API', rqbTest);
  it('Outputs the result of a more "realistic" schema', realTest);
});
