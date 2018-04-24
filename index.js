const express = require('express');
var crypto = require('crypto');
const bodyParser = require('body-parser');
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express');
const { makeExecutableSchema } = require('graphql-tools');
const Datastore = require('@google-cloud/datastore');
const PORT = 8080;

// Instantiate a datastore client
const datastore = Datastore();

// The GraphQL schema in string form
const typeDefs = `
  type Query { books: [Book] }
  type Book { id: String, title: String, author: String }
  type Mutation {
    addBook (
      title: String!
      author: String!
    ): [Book]
  }
`;

function getBooks() {
  const query = datastore.createQuery('books');

  return datastore.runQuery(query).then(results => {
    const entities = results[0];
    return entities;
  });
}

function insertBook(book) {
  return datastore.save({
    key: datastore.key('books'),
    data: book
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
    }
  },
  Mutation: {
    addBook: (_, { title, author }) => {
      return insertBook({ title, author })
        .then(() => getBooks())
        .then(books => {
          return books;
        });
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

const server = app.listen(PORT, () => {
  const host = server.address().address;
  const port = server.address().port;

  console.log(`Example app listening at http://${host}:${port}`);
});
