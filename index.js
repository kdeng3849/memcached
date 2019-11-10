var express = require('express');
var Memcached = require('memcached');
var morgan = require('morgan');
var mariadb = require('mariadb');


var app = express();
app.use(morgan('common'));

const pool = mariadb.createPool({host: 'localhost', user: 'root', database: 'hw8', connectionLimit: 5});
const memcached = new Memcached('127.0.0.1:11211');

async function queryDatabase(club, pos) {
  let conn;
  try {
    conn = await pool.getConnection();
    const assists = await conn.query("SELECT max(a) as max_assists, avg(a) as avg_assists FROM assists where club=? and pos=?", [club, pos]);
    const players = await conn.query("SELECT player FROM assists WHERE club=? AND pos=? and a=? ORDER BY a, gs DESC, player", [club, pos, assists[0].max_assists]);

    results = {
      "club": club,
      "pos": pos,
      "max_assists": assists[0].max_assists,
      "player": players[0].player,
      "avg_assists": assists[0].avg_assists,
    }

    // either save the results as a json string, or just do res.send()
    // otherwise it will get stringified twice

    // saves results for 60 seconds
    memcached.set("club=" + club + "&pos=" + pos, results, 60, function (err, result) { 
      if(err)
        console.log("set error", err);
      if(result)
        console.log("set result", result);
    });
    
    return results;
  } 
  catch(err) {
	  throw err;
  } 
  finally {
    if(conn) 
      conn.release();
  }
}

app.get('/hw8', function(req, res){
  let club = req.query.club;
  let pos = req.query.pos;

  memcached.get("club=" + club + "&pos=" + pos, function(err, result) {
    if(err)
      console.log("get error", err);
    if(result) {
      console.log("get result", result);
      res.json(result);
    }
    else { // the else is important
      queryDatabase(club, pos).then(response => {
        res.json(response);
      })
      .catch(err => {
        console.log(err)
      });
    }
  });
});

// app.listen(5000);
app.listen(80);