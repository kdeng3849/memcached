var express = require('express');
var app = express();

const mariadb = require('mariadb');
const pool = mariadb.createPool({host: 'localhost', user: 'root', database: 'hw8', connectionLimit: 5});

async function asyncFunction(club, pos) {
  let conn;
  try {

    conn = await pool.getConnection();
    const assists = await conn.query("SELECT max(a) as max_assists, avg(a) as avg_assists FROM assists where club=? and pos=?", [club, pos]);
    const players = await conn.query("SELECT player FROM assists WHERE club=? AND pos=? and a=? ORDER BY a, gs DESC, player", [club, pos, assists[0].max_assists]);
    // console.log(assists[0].max_assists, assists[0].avg_assists)
    // console.log(players)
    
    let results = {
        "club": club,
        "pos": pos,
        "max_assists": assists[0].max_assists,
        "player": players[0].player,
        "avg_assists": assists[0].avg_assists,
    }
    
    return results;

  } 
  catch(err) {
	throw err;
  } 
  finally {
    if(conn) 
        conn.release(); //release to pool
  }
}

app.get('/', function(req, res){
    let club = req.query.club;
    let pos = req.query.pos;

    asyncFunction(club, pos).then(response => {
        res.json(response);
    });
});

app.listen(5000);