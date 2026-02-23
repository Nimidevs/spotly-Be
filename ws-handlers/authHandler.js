import { verifyTokenForWs } from "../middlewares/authenticate";
import redis from "../redis";

export const authHandler = async (ws, payload, connectionsMap) => {
  console.log("I got here man");
  console.log("payload: ", payload);
  const {
    token,
    firstName,
    lastName,
    bio,
    joinReason,
    avatarUrl,
    availability,
  } = payload;

  if (!token) {
    ws.close(4001, "Missing Token");
    return;
  }
  let userId;
  try {
    userId = verifyTokenForWs(token);
  } catch (error) {
    ws.close(4001, "Unauthorised");
    return;
  }
  ws.userId = userId;
  connectionsMap.set(userId, ws);
  await redis.hSet(`user:${userId}`, {
    firstName,
    lastName,
    bio,
    joinReason, // changed from 'reason'
    avatarUrl, // changed from 'avatar'
    availability: availability ? "available" : "unavailable",
  });
  //console.log('active connections map:', connectionsMap)
  ws.send(
    JSON.stringify({
      event: "auth:success",
      data: {
        message: "connected",
      },
    }),
  );
};


/*original code block in the ws initialization*/
// const token = new URL(req.url, "http://localhost").searchParams.get("token");
// if (!token) {
//   ws.close(4001, "Missing Token");
//   return
// }
// let userId;
// try {
//   userId = verifyTokenForWs(token);
// } catch (error) {
//   ws.close(4001, "Unauthorized");
//   return
// }

// ws.userId = userId; /** Remove this later when you add redis  */
// activeConections.set(userId, ws)

// ws.send("you're connected foo");
// ws.on("message", (data) => {
//   ws.send(`echo: ${data}`);
// });
