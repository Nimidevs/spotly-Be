import redis from "../redis";

export const chatIntent = async (ws, payload, connectionsMap) => {
  const requestingUserId = ws.userId;
  const [firstName, lastName, availability, avatar] = await redis.hmGet(
    `user:${requestingUserId}`,
    ["firstName", "lastName", "availability", "avatar"],
  );
  if (availability !== "available") return;
  /**Consider adding a redis object/map for every request with a short TTL so it expires aftera while, it's also deleted immediately a user accepts the chat request */
  const { userToMessageId } = payload;
  const userToMessageWs = connectionsMap.get(userToMessageId);

  userToMessageWs.send(
    JSON.stringify({
      event: "chat:Request",
      data: { userId: requestingUserId, firstName, lastName, avatar },
    }),
  );
};

// When User B accepts the chat request
// socket.on("chat:request_accept", async ({ requestId }) => {
//   const request = await redis.get(`chat_request:${requestId}`);
//   if (!request) {
//     return socket.emit("error", { message: "Request expired" });
//   }

//   const { from, to } = JSON.parse(request);

//   // Check if chat already exists (prevent duplicates)
//   let chatRoomId = await findExistingChatRoom(from, to);

//   if (!chatRoomId) {
//     // Create new chat room with Prisma
//     const chatRoom = await createChatRoom(from, to);
//     chatRoomId = chatRoom.id;
//   }

//   // Delete the request
//   await redis.del(`chat_request:${requestId}`);

//   // Notify both users
//   const fromSocketId = await redis.get(`user_socket:${from}`);
//   const toSocketId = await redis.get(`user_socket:${to}`);

//   const payload = { chatRoomId };

//   if (fromSocketId) {
//     io.to(fromSocketId).emit("chat:accepted", payload);
//   }
//   if (toSocketId) {
//     io.to(toSocketId).emit("chat:accepted", payload);
//   }
// });

// Joining a chat room
// socket.on("chat:join", async ({ chatRoomId }) => {
//   const userId = socket.userId;

//   // Verify user is participant
//   const isParticipant = await prisma.chatRoomParticipant.findUnique({
//     where: {
//       chatRoomId_userId: {
//         chatRoomId,
//         userId,
//       },
//     },
//   });

//   if (!isParticipant) {
//     return socket.emit("error", { message: "Not authorized" });
//   }

//   socket.join(chatRoomId);

//   // Load message history
//   const messages = await getChatRoomMessages(chatRoomId, userId);
//   socket.emit("chat:history", { messages });
// });

// // Sending a message
// socket.on("chat:message", async ({ chatRoomId, content }) => {
//   const userId = socket.userId;

//   const message = await sendMessage(chatRoomId, userId, content);

//   // Broadcast to everyone in the room (including sender)
//   io.to(chatRoomId).emit("chat:new_message", message);
// });
