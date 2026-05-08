import { latLngToCell, cellToLatLng, cellToBoundary } from "h3-js";
import redis from "../redis";

export const createDemoData = async () => {
  const targetH3 = "8c589c9847315ff";

  // Get the exact center of your target H3 cell
  const [centerLat, centerLng] = cellToLatLng(targetH3);

  console.log(`Using center: ${centerLat}, ${centerLng}`);

  // Generate small variations around the center (very tiny to stay in same cell)

  const generateNearbyCoord = (baseLat, baseLng, index) => {
    // Very small offsets (0.00001 degrees ≈ 1 meter)
    const offset = 0.00001;
    return {
      lat: baseLat + (Math.random() - 0.5) * offset,
      lng: baseLng + (Math.random() - 0.5) * offset,
    };
  };

  const baseUsers = [
    {
      firstName: "Aisha",
      lastName: "Okonkwo",
      bio: "Coffee enthusiast and bookworm ☕📚",
      joinReason: "CASUAL",
    },
    {
      firstName: "Chidi",
      lastName: "Eze",
      bio: "Tech lover | Gaming addict 🎮",
      joinReason: "DATING",
    },
    {
      firstName: "Ngozi",
      lastName: "Adebayo",
      bio: "Fitness freak 💪 Let's workout together!",
      joinReason: "FRIENDSHIP",
    },
    {
      firstName: "Emeka",
      lastName: "Okoro",
      bio: "Foodie exploring Lagos cuisine 🍲",
      joinReason: "CASUAL",
    },
    {
      firstName: "Funmi",
      lastName: "Bello",
      bio: "Art & culture enthusiast 🎨",
      joinReason: "FRIENDSHIP",
    },
    {
      firstName: "Tunde",
      lastName: "Lawal",
      bio: "Music producer | Always vibing 🎵",
      joinReason: "DATING",
    },
    {
      firstName: "Zainab",
      lastName: "Ibrahim",
      bio: "Entrepreneur | Let's network! 💼",
      joinReason: "NETWORKING",
    },
    {
      firstName: "Kunle",
      lastName: "Williams",
      bio: "Photographer capturing Lagos 📸",
      joinReason: "CASUAL",
    },
    {
      firstName: "Bisi",
      lastName: "Adeyemi",
      bio: "Yoga instructor 🧘‍♀️ Find your zen",
      joinReason: "FRIENDSHIP",
    },
    {
      firstName: "Segun",
      lastName: "Fashola",
      bio: "Sports fan ⚽ Up for a game anytime",
      joinReason: "CASUAL",
    },
  ];

  const userData = baseUsers.map((user, index) => {
    const coords = generateNearbyCoord(centerLat, centerLng, index);
    return {
      userId: `user_${String(index + 1).padStart(3, "0")}`,
      ...user,
      avatarUrl: `https://i.pravatar.cc/150?img=${index + 1}`,
      availability: "available",
      lat: coords.lat,
      lng: coords.lng,
    };
  });

  console.log("🌱 Seeding demo data...");
  console.log(`Target H3 index: ${targetH3}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const data of userData) {
    try {
      const h3Index = latLngToCell(data.lat, data.lng, 12);

      if (h3Index === targetH3) {
        console.log(
          `✅ ${data.firstName} ${data.lastName} - H3: ${h3Index} - Lat: ${data.lat} - Lng ${data.lng}`,
        );
        successCount++;
      } else {
        console.log(
          `❌ ${data.firstName} ${data.lastName} - H3: ${h3Index} (wrong cell!)`,
        );
        failCount++;
        continue; // Skip adding this user
      }

      await redis
        .multi()
        .hSet(`user:${data.userId}`, data)
        .sAdd(`h3:${h3Index}`, data.userId)
        .exec();
    } catch (error) {
      console.error(`Error processing user ${data.userId}:`, error);
      failCount++;
    }
  }

  console.log(`\n✅ Successfully seeded ${successCount} users`);
  if (failCount > 0) {
    console.log(`⚠️  ${failCount} users were in wrong cells and skipped`);
  }
};
