import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redis = new createClient({
  url: process.env.REDIS_URL,
});

redis.on("error", () => {
  console.log();
});
redis.on("reconnecting", () => console.log("'↻ Reconnecting..."));
// redis.monitor((err, monitor) => {
//   monitor.on("monitor", (time, args) => {
//     console.log("Redis command:", args);
//   });
// });

// async function connectRedis(){
//     await redis.connect();
// }
// connectRedis()

await redis.connect();

export default redis;
