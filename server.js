import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull
} from 'graphql'
import express from 'express'
import graphqlHTTP from 'express-graphql'
import arangojs, { aql } from 'arangojs'

let db = arangojs({
  url: `http://ottawa_graph:graph@127.0.0.1:8529`,
  databaseName: 'ottawa_graph'
})

async function getPersonByName (name) {
  let query = aql`
	  FOR person IN persons
	    FILTER person.name == ${ name }
	      LIMIT 1
	      RETURN person
	`
  let results = await db.query(query)
  return results.next()
}

async function getFriends (id) {
  let query = aql`
	  FOR vertex IN OUTBOUND ${id} knows
	    RETURN vertex
	`
  let results = await db.query(query)
  return results.all()
}

let Person = new GraphQLObjectType({
  name: 'Person',
  fields: () => ({
    name: {
      type: GraphQLString
    },
    friends: {
      type: new GraphQLList(Person),
      resolve(root) {
	return getFriends(root._id)
      }
    }
  })
})

let schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
      person: {
	args: {
	  name: {
	    type: new GraphQLNonNull(GraphQLString)
	  }
	},
	type: Person,
	resolve: (root, args) => {
	  return getPersonByName(args.name)
	},
      }
    })
  })
})

const app = express()

app.use('/graphql', graphqlHTTP({
    schema: schema,
    graphiql: true
}))

app.listen(3000)
