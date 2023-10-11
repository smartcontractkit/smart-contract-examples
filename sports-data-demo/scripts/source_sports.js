// This example shows how to make a call to an open API (no authentication required)
// to retrieve asset price from a symbol(e.g., ETH) to another symbol (e.g., USD)

// AllSports football (soccer) API https://apiv2.allsportsapi.com/football/?&met=Teams&leagueId=leagueId&APIkey=APIKey`

// Refer to https://github.com/smartcontractkit/functions-hardhat-starter-kit#javascript-code

// Arguments can be provided when a request is initated on-chain and used in the request source code as shown below
const metParams = args[0];
const leagueId = args[1];

if (!secrets.apiKey) {
    throw Error(
        "ALL_SPORTS_API API KEY environment variable not set for ALL_SPORTS_API API.  Get a free key from https://allsportsapi.com/soccer-football-api"
    );
}

// make HTTP request
const url = `https://apiv2.allsportsapi.com/football/?&met=${metParams}&leagueId=${leagueId}&APIkey=${secrets.apiKey}`;
console.log(`HTTP GET Request to ${url}`);

const sportsRequest = Functions.makeHttpRequest({
    url: url,
  });
  
  // Execute the API request (Promise)
  const sportsResponse = await sportsRequest;
  if (sportsResponse.error) {
    console.error(sportsResponse.error);
    throw Error("Request failed");
  }
  
  const data = sportsResponse["data"];
  if (data["success"] !== 1) {
    console.error(data.Message);
    throw Error(`Functional error. Read message: ${data.Message}`);
  }

  // Example of getting a random goalkeeper from the world cup 2022 with as much stats as possible.

  const allGoalkeepers = data["result"].flatMap((team) => {
    return team.players.filter((player) => player.player_type === "Goalkeepers");
  })

  const randomNumber = Math.floor(Math.random() * allGoalkeepers.length)
  
  const randomGoalkeeper = allGoalkeepers[randomNumber]
  const result = {
    goalkeeper: {
      player_name: randomGoalkeeper.player_name,
      player_type: randomGoalkeeper.player_type,
      player_image: randomGoalkeeper.player_image,
      player_match_played: randomGoalkeeper.player_match_played,
      player_test: randomGoalkeeper.player_match_played,
      player_match: randomGoalkeeper.player_match_played,
    },
  };
  
  return Functions.encodeString(JSON.stringify(result));
