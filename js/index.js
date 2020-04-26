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
    let tr = document.createElement("tr")
    let gameNameTD = document.createElement("td")
    let numPlayersTD = document.createElement("td")
    let currentTurnTD = document.createElement("td")

    gameNameTD.innerText = game.gameName
    numPlayersTD.innerText = game.numPlayers
    currentTurnTD.innerText = game.currentPlayer

    tr.appendChild(gameNameTD)
    tr.appendChild(numPlayersTD)
    tr.appendChild(currentTurnTD)

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
        let gameName = config.gameName
        let numPlayers = config.users.length
        let currentPlayer = config.currentTurn
        games.push({
          gameName: gameName,
          numPlayers: numPlayers,
          currentPlayer: currentPlayer
        })
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