import H3 from "h3-js";
import dotenv from "dotenv";
import redis from "../redis";
import { getNearbyUsers, getVisibleUsers } from "../services/getNearbyUsers";
import { notifyUsers } from "../services/notifyUsers";

dotenv.config();
export const locationHandler = async (ws, payload, connectionsMap) => {
  const userId = ws.userId;

  if (!userId) {
    ws.close(4002, "Not authenticated");
    return;
  }

  /*Consider sending alongside users bio/about on the first location update (This comments has been deprecated as i fixed it the right way in authHandler)*/
  const { lat, lng } = payload;
  const resolution = Number(process.env.H3_Resolution) || 12;
  const h3Index = H3.latLngToCell(lat, lng, resolution);

  const userKey = `user:${userId}`;
  const newH3Key = `h3:${h3Index}`;

  const [
    oldH3Index,
    availability,
    firstName,
    lastName,
    bio,
    joinReason,
    avatarUrl,
  ] = await redis.hmGet(userKey, [
    "h3",
    "availability",
    "firstName",
    "lastName",
    "bio",
    "joinReason",
    "avatarUrl",
  ]);
  // const oldH3Index = await redis.hGet(userKey, "h3");
  // const availability = await redis.hGet(userKey, "availability");

  const isUserVisible = availability === "available";

  // CASE A: first location
  if (!oldH3Index) {
    await redis
      .multi()
      .hSet(userKey, { lat, lng, h3: h3Index })
      .sAdd(newH3Key, userId)
      .exec();

    const nearby = await getNearbyUsers(newH3Key, userId);
    const visible = getVisibleUsers(nearby);
    ws.send(JSON.stringify({ event: "nearby:users", data: visible }));

    if (isUserVisible) {
      const ids = nearby.map((u) => u.userId); /**Changed id to userId */
      notifyUsers(
        ids,
        "nearby:user:enter",
        {
          userId,
          lat,
          lng,
          availability,
          firstName,
          lastName,
          bio,
          joinReason,
          avatarUrl,
        },
        connectionsMap,
      );
    }

    return;
  }

  // CASE B: same H3 cell
  if (oldH3Index === h3Index) {
    console.log("hereeeeeeee");
    await redis.hSet(userKey, { lat, lng });
    return;
  }

  // CASE C: moved to a new H3 cell
  await redis
    .multi()
    .sRem(`h3:${oldH3Index}`, userId)
    .sAdd(newH3Key, userId)
    .hSet(userKey, { lat, lng, h3: h3Index })
    .exec();

  let oldMembers = await redis.sMembers(`h3:${oldH3Index}`);
  let filteredOldMembers = oldMembers.filter((id) => id !== userId);
  console.log(oldMembers, filteredOldMembers);
  notifyUsers(
    filteredOldMembers,
    "nearby:user:leave",
    { userId },
    connectionsMap,
  );

  const nearby = await getNearbyUsers(newH3Key, userId);
  const visible = getVisibleUsers(nearby);
  ws.send(
    JSON.stringify({
      event: "nearby:users",
      data: visible,
    }),
  );

  if (isUserVisible) {
    const ids = nearby.map((u) => u.userId);
    notifyUsers(
      ids,
      "nearby:user:enter",
      {
        userId,
        lat,
        lng,
        availability,
        firstName,
        lastName,
        bio,
        joinReason,
        avatarUrl,
      },
      connectionsMap,
    );
  }
};
