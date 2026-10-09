import { env } from "./config/env";
import { createApp } from "./app";
import { prisma } from "./utils/prisma";

const app = createApp();

const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`杨小厨 API listening on http://localhost:${env.PORT}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
