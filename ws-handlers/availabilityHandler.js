import redis from "../redis";
import { notifyUsers } from "../services/notifyUsers";

export const availabilityHandler = async (ws, payload, connectionsMap) => {
  const userId = ws.userId;
  if (!userId) return ws.close(4002, "Not authenticated");

  const { availability: newAvailability } = payload;

  const userKey = `user:${userId}`;
  const user = await redis.hGetAll(userKey);

  const {
    availability: oldAvailability,
    h3,
    lat,
    lng,
  } = user;

  // Persist first
  await redis.hSet(userKey, "availability", newAvailability);

  const wasVisible = oldAvailability === "available";
  const isVisible = newAvailability === "available";

  // No visibility change → do nothing
  if (wasVisible === isVisible) return;

  const members = await redis.sMembers(`h3:${h3}`);
  const otherUsers = members.filter(id => id !== userId);

  if (isVisible) {
    // ENTER
    notifyUsers(
      otherUsers,
      "nearby:user:enter",
      { userId, lat, lng },
      connectionsMap
    );

    // Refresh caller snapshot
    // (important for UI correctness)
    // nearby:users should exclude unavailable users
  } else {
    // LEAVE
    notifyUsers(
      otherUsers,
      "nearby:user:leave",
      { userId },
      connectionsMap
    );
  }
};
