const express = require('express');
const bodyParser = require('body-parser');
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express');
const { makeExecutableSchema } = require('graphql-tools');
const Datastore = require('@google-cloud/datastore');
const PORT = process.env.PORT || 8080;

// Instantiate a datastore client
const datastore = Datastore();

// The GraphQL schema in string form
const typeDefs = `
  type Query { books: [Book], book(id: Float!): Book }
  type Book { id: String, title: String, author: String }
  type Mutation {
    addBook (
      title: String!
      author: String!
    ): [Book],
    deleteBook (id: Float!): [Book],
    updateBook (
      id: Float!
      title: String
      author: String
    ): Book
  }
`;

function getBooks() {
  const query = datastore.createQuery('books');

  return datastore.runQuery(query).then(results => {
    const entities = results[0];
    return entities;
  });
}

function getBook(id) {
  const key = datastore.key(['books', id]);
  return datastore.get(key).then(result => {
    const entity = result[0];
    return entity;
  });
}

function insertBook(book) {
  return datastore.save({
    key: datastore.key('books'),
    data: book
  });
}

function deleteBook(id) {
  const key = datastore.key(['books', id]);
  return datastore.delete(key);
}

function updateBook(args) {
  const { id } = args;
  const key = datastore.key(['books', id]);
  return datastore.get(key).then(result => {
    const entity = result[0];
    let save = false;
    for (let field in args) {
      if (entity[field] !== args[field] && field !== 'id') {
        save = true;
        entity[field] = args[field];
      }
    }
    if (save) return datastore.save({ key, data: entity }).then(() => entity);
    return entity;
  });
}

// The resolvers
const resolvers = {
  Book: {
    id: obj => {
      return obj[datastore.KEY].id;
    }
  },
  Query: {
    books: () => {
      const items = getBooks();
      return items;
    },
    book: (_, { id }) => {
      const item = getBook(id);
      return item;
    }
  },
  Mutation: {
    addBook: (_, { title, author }) => {
      return insertBook({ title, author })
        .then(() => getBooks())
        .then(books => {
          return books;
        });
    },
    deleteBook: (_, { id }) => {
      return deleteBook(id)
        .then(() => getBooks())
        .then(books => {
          return books;
        });
    },
    updateBook: (_, args) => {
      return updateBook(args);
    }
  }
};

// Put together a schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

// Initialize the app
const app = express();
app.enable('trust proxy');

// The GraphQL endpoint
app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }));

// GraphiQL, a visual editor for queries
app.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }));

const server = app.listen(PORT);
