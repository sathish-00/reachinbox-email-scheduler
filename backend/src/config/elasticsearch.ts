import { Client } from "@elastic/elasticsearch";
import { env } from "./env";

export const elasticsearchClient = new Client({
  node: env.ELASTICSEARCH_URL,
  ...(env.ELASTICSEARCH_API_KEY
    ? {
        auth: {
          apiKey: env.ELASTICSEARCH_API_KEY,
        },
      }
    : {}),
});

export const connectElasticsearch = async (): Promise<void> => {
  await elasticsearchClient.ping();
  console.log("Elasticsearch connected");
};