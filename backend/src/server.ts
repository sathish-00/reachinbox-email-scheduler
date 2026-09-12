import app from "./app";
import { env } from "./config/env";
import { connectDatabase } from "./config/database";
import { redisConnection } from "./config/redis";
import { connectElasticsearch } from "./config/elasticsearch";
import { ensureEmailIndex } from "./services/elasticsearch.service";

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    await redisConnection.ping();
    console.log("Redis connected");

    await connectElasticsearch();
    await ensureEmailIndex();

    app.listen(env.PORT, () => {
      console.log(
        `Server running on http://localhost:${env.PORT}`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();