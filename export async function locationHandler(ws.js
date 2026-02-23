export async function locationHandler(ws, payload, connectionsMap) {
  const userId = ws.userId;
  if (!userId) return ws.close(4002, "Not authenticated");

  const { lat, lng } = payload;
  const resolution = Number(process.env.H3_RESOLUTION) || 12;
  const newH3 = H3.latLngToCell(lat, lng, resolution);

  const userKey = `user:${userId}`;
  const oldH3 = await redis.hGet(userKey, "h3");
  const availability = await redis.hGet(userKey, "availability");

  const isUserVisible = availability === "available";

  // ---- FIRST LOCATION ----
  if (!oldH3) {
    await redis
      .multi()
      .hSet(userKey, { lat, lng, h3: newH3 })
      .sAdd(`h3:${newH3}`, userId)
      .exec();

    const nearby = await getVisibleUsersInH3(`h3:${newH3}`, userId);
    ws.send(JSON.stringify({ event: "nearby:users", data: nearby }));

    if (isUserVisible) {
      const ids = nearby.map(u => u.id);
      notifyUsers(ids, "nearby:user:enter", { userId, lat, lng }, connectionsMap);
    }
    return;
  }

  // ---- SAME CELL ----
  if (oldH3 === newH3) {
    await redis.hSet(userKey, { lat, lng });
    return;
  }

  // ---- MOVED CELLS ----
  await redis
    .multi()
    .sRem(`h3:${oldH3}`, userId)
    .sAdd(`h3:${newH3}`, userId)
    .hSet(userKey, { lat, lng, h3: newH3 })
    .exec();

  // Notify old cell (leave)
  const oldMembers = await redis.sMembers(`h3:${oldH3}`);
  notifyUsers(oldMembers, "nearby:user:leave", { userId }, connectionsMap);

  // Notify self (snapshot)
  const nearby = await getVisibleUsersInH3(`h3:${newH3}`, userId);
  ws.send(JSON.stringify({ event: "nearby:users", data: nearby }));

  // Notify new cell (enter)
  if (isUserVisible) {
    const ids = nearby.map(u => u.id);
    notifyUsers(ids, "nearby:user:enter", { userId, lat, lng }, connectionsMap);
  }
}
