import redis from "../redis";
import prisma from "../lib/prisma";
import { findExistingChatRoom } from "../services/findExistingChatRoom";

export const chatAccept = async (ws, payload, connectionsMap) => {
  const acceptingUserId = ws.userId;
  const { requestingUserId } = payload;
  const requestingUserWs = connectionsMap.get(requestingUserId);

  const room = await findExistingChatRoom(requestingUserId, acceptingUserId);
  if (!room) {
    room = await prisma.$transaction(async (tx) => {
      const chatRoom = await tx.chatRoom.create({
        data: {},
      });

      await tx.chatParticipant.createMany({
        data: [
          { userId: acceptingUserId, chatRoomId: chatRoom.id },
          { userId: requestingUserId, chatRoomId: chatRoom.id },
        ],
      });

      return chatRoom;
    });
  }

  ws.send(
    JSON.stringify({
      event: "chat:started",
      data: { chatRoomId: room.id },
    }),
  );
  requestingUserWs.send(
    JSON.stringify({
      event: "chat:started",
      data: { chatRoomId: room.id },
    }),
  );
  
};
