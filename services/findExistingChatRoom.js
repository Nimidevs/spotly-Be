import prisma from "../lib/prisma";

export async function findExistingChatRoom(userAId, userBId) {
  // Find rooms where both users are participants
  const chatRoom = await prisma.chatRoom.findFirst({
    where: {
      AND: [
        {
          participants: {
            some: { userId: userAId },
          },
        },
        {
          participants: {
            some: { userId: userBId },
          },
        },
      ],
      // Optional: Ensure it's exactly 2 participants (not a group chat)
      participants: {
        every: {
          userId: { in: [userAId, userBId] },
        },
      },
    },
  });

  return chatRoom || null;
}

/**Totally AI generated fix up */