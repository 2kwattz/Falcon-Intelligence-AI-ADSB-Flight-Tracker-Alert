const mysql = require('mysql2/promise'); // Raw SQL

// Connection Pool

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true, // To implement users in queue if resouece full
    connectionLimit: 100,
    queueLimit: 0,
})

const connectDatabase = async () => {
try{
    const connection = await pool.getConnection();
    console.log(`[*] MySQL Database connected successfully`);
    connection.release(); // Releasing after testing connection

}
catch(error){
    console.error(`[*] Error In connecting to the database `,error.message || error);
    // process.exit(1)
}
}

connectDatabase()

module.exports = {
    pool,
    connectDatabase
};