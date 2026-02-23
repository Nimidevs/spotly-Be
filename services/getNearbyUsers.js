import redis from "../redis";

export const getNearbyUsers = async (h3Key, excludeUserId) => {
  const ids = await redis.sMembers(h3Key);
  console.log("ids", ids);
  const filtered = ids.filter((id) => id !== excludeUserId);
  console.log("filtered", filtered);

  if (filtered.length === 0) return [];

  const pipeline = redis.multi();
  filtered.forEach((id) =>
    pipeline.hmGet(`user:${id}`, [
      "lat",
      "lng",
      "availability",
      "firstName",
      "lastName",
      "bio",
      "joinReason",
      "avatarUrl",
    ]),
  );

  const results = await pipeline.exec();
  console.log(results);

  // return results
  //   .map(([, data], i) => ({ userId: filtered[i], ...data })) /*Changed 'id' to 'userId' so it'd be constant and uniform across the code base */
  //   .filter((u) => u.availability === "available");
  return results
    .map((data, i) => ({
      userId: filtered[i],
      lat: data[0],
      lng: data[1],
      availability: data[2],
      firstName: data[3],
      lastName: data[4],
      bio: data[5],
      joinReason: data[6],
      avatarUrl: data[7],
    }))
    
};

export const getVisibleUsers = (nearbyUsers) => {
  return nearbyUsers.filter((u) => u.availability === "available");
};
