import { ApolloServer, gql } from "apollo-server-azure-functions";
import { ApolloServerPluginLandingPageLocalDefault } from "apollo-server-core";
import Database, { Database as DB} from "better-sqlite3";
import fetch from 'cross-fetch';

const db_connect = async () => {
    const db_file = await fetch('https://keablob.blob.core.windows.net/products/products.db');
    const db_db = await db_file.arrayBuffer();
    const db_buff = Buffer.from(db_db);
    const db = new Database(db_buff);
    return db;
}
let db: DB;
db_connect().then(res => db = res);

const typeDefs = gql`
    type Product {
        id: ID!
        product_name: String!
        product_sub_title: String
        product_description: String
        main_category: String
        sub_category: String
        price: Float
        link: String
        overall_rating: Float
    }
    type Query {
        getProduct(id: ID!): Product
        getProducts: [Product]
    }

`;

const resolvers = {
    Query: {
        getProduct: (_, args) => db.prepare(
            `SELECT * FROM products
            WHERE id = ?`
        ).get(args.id),
        
        getProducts: () => db.prepare(
            `SELECT * FROM products`
        ).all(),
    }
}

const server = new ApolloServer({
    typeDefs,
    resolvers,
    csrfPrevention: true,
    cache: 'bounded',
    plugins: [
        ApolloServerPluginLandingPageLocalDefault({ embed: true }),
    ],
});

export default server.createHandler({
    cors: {
        origin: '*'
    },
});