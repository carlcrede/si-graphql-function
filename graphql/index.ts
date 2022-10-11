import { ApolloServer, gql } from 'apollo-server-azure-functions';
import { ApolloServerPluginLandingPageLocalDefault } from "apollo-server-core";
import Database, { Database as DB} from "better-sqlite3";
import fetch from 'cross-fetch';

const db_connect = async () => {
    const db_file = await fetch('https://keablob.blob.core.windows.net/products/products.db');
    const db_db = await db_file.arrayBuffer();
    const db_buff = Buffer.from(db_db);
    const db = new Database(db_buff);
    console.log("here")
    const query = db.prepare(`SELECT * FROM products`).all(); 
    console.log(query)
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
        getProductsBySearchTerm(term:String!): [Product]
        getProductsByPrice(maxPrice:Float, minPrice:Float, ascending: Boolean=True): [Product]
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
        
        getProductsBySearchTerm: (_,args) => {
            return db.prepare(
            `SELECT * FROM products
            WHERE product_name LIKE '%${args.term}%' OR product_sub_title LIKE '%${args.term}%' OR product_description LIKE '%${args.term}%'`
        ).all()
    },

        getProductsByPrice: (maxPrice?:Number, minPrice?:Number, ascending: Boolean=true) => { 
            const orderedby: String = ascending ? 'ASC' : 'DESC';
            const minPriceQuery: String = (!maxPrice && minPrice) ? `WHERE price >= ${minPrice}` : ""
            const maxPriceQuery: String = (maxPrice && !minPrice) ? `WHERE price <= ${maxPrice}` : ""
            const bothPriceQuery: String = (maxPrice && minPrice) ? `WHERE price <= ${maxPrice} AND price >= ${minPrice}` : ""
            db.prepare(
            `SELECT * FROM products
            ${minPriceQuery}
            ${bothPriceQuery}
            ${maxPriceQuery}
            ORDER BY price ${orderedby} `
        ).all()
    },
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