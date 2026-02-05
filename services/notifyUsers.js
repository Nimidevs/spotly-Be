import redis from "../redis";

// export const pushUserEvent = async (
//   h3Members,
//   connectionsMap,
//   userId,
//   eventType,
// ) => {
//   let newUser;
//   if (eventType === "enter") {
//     newUser = await redis.hGet(`user:${userId}`);
//   }
//   const returnData = {
//     event: `nearby:user${eventType}`,
//   };
//   if (eventType === "leave") {
//     returnData.userId = userId;
//   } else {
//     returnData.user = newUser;
//   }
//   h3Members.forEach((id) => {
//     if (connectionsMap.has(id)) {
//       const idWsInstance = connectionsMap.get(id);
//       idWsInstance.send(JSON.stringify(returnData));
//     }
//   });
// };

export function notifyUsers(userIds, event, payload, connectionsMap) {
  userIds.forEach(id => {
    const ws = connectionsMap.get(id);
    if (ws) {
      ws.send(JSON.stringify({ event, data: payload }));
    }
  });
}