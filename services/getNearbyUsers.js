import redis from "../redis";

export const getNearbyVisibleUsers = async (h3Key, excludeUserId) => {
  const ids = await redis.sMembers(h3Key);
  const filtered = ids.filter((id) => id !== excludeUserId);

  if (filtered.length === 0) return [];

  const pipeline = redis.multi();
  filtered.forEach((id) =>
    pipeline.hmGet(`user:${id}`, "lat", "lng", "availability"),
  );

  const results = await pipeline.exec();

  // return results
  //   .map(([, data], i) => ({ userId: filtered[i], ...data })) /*Changed 'id' to 'userId' so it'd be constant and uniform across the code base */
  //   .filter((u) => u.availability === "available");
  return results
    .map(([, data], i) => ({
      userId: filtered[i],
      lat: data[0],
      lng: data[1],
      availability: data[2],
    }))
    .filter((u) => u.availability === "available");
};
