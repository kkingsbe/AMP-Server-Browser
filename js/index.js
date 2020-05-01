AWS.config.region = 'us-east-1'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-1:c4733679-8bcb-4b4e-931d-6794a9e28293',
});
const BUCKET_NAME = 'aurora-multiplayer-saves'
const s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  params: {Bucket: BUCKET_NAME}
})

populateGamesTable()

async function populateGamesTable() {
  let games = await getActiveGames()
  console.log(games)
  console.log(games.length)
  for(let game of games) {
    console.log(game)
    let tr = document.createElement("tr")
    let gameNameTD = document.createElement("td")
    let numPlayersTD = document.createElement("td")
    let currentTurnTD = document.createElement("td")
    let turnsSubmittedTD = document.createElement("td")
    let turnsLeftTD = document.createElement("td")
    let checkedOutTD = document.createElement("td")

    gameNameTD.innerText = game.gameName
    numPlayersTD.innerText = game.numPlayers
    currentTurnTD.innerText = game.version=="old" ? game.currentPlayer : "(async game)"
    turnsSubmittedTD.innerText = game.turnsSubmitted
    turnsLeftTD.innerText = game.numPlayers - game.turnsSubmitted
    checkedOutTD.innerText = game.checkedOut ? "Yes" : "No"

    tr.appendChild(gameNameTD)
    tr.appendChild(numPlayersTD)
    tr.appendChild(currentTurnTD)
    tr.appendChild(turnsSubmittedTD)
    tr.appendChild(turnsLeftTD)
    tr.appendChild(checkedOutTD)

    document.getElementById("gamesTable").appendChild(tr)
  }
}

async function getActiveGames() {
  return new Promise(async (resolve, reject) => {
    let games = []
    const params = {
      Delimiter: '/'
    }
    s3.listObjectsV2(params, async (err, data) => {
      if(err) {
        reject(err)
      }
      for(let game of data.CommonPrefixes) {
        let config = await getGameConfig(game.Prefix)
        let checkedOut = await isCheckedOut(game.Prefix)
        console.log(checkedOut)

        //New version of mp client
        if(typeof(config.currentTurn) == 'undefined') {
          let gameName = config.gameName
          let numPlayers = config.users.length
          let turnsSubmitted = 0
          for(let user of config.users) {
            if(user.hasPlayed) turnsSubmitted ++
          }
          console.log(config)
          games.push({
            version: "new",
            gameName: gameName,
            numPlayers: numPlayers,
            turnsSubmitted: turnsSubmitted,
            checkedOut: checkedOut
          })
        } else { //Old version
          let gameName = config.gameName
          let numPlayers = config.users.length
          let currentPlayer = config.currentTurn
          console.log(config)
          games.push({
            version: "old",
            gameName: gameName,
            numPlayers: numPlayers,
            currentPlayer: currentPlayer,
            turnsSubmitted: config.warpVotes.length,
            checkedOut: false
          })
        }
      }
      resolve(games)
    })
  })
}

async function getGameConfig(gameName) {
  return new Promise((resolve, reject) => {
    const params = {
      Key: `${gameName}multiplayer.config`
    }
    s3.getObject(params, (err, data) => {
      if (err) {
        reject(err)
        return
      }
      resolve(JSON.parse(data.Body.toString()))
    })
  })
}

async function isCheckedOut(gameName) {
  return new Promise((resolve, reject) => {
    const params = {
      Key: `${gameName}lock`
    }
    s3.getObject(params, (err, data) => {
      if (err) {
        resolve(false)
        return
      }
      resolve(true)
    })
  })
}