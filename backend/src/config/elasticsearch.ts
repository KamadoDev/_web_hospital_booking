import { Client } from "@elastic/elasticsearch";

const elasticsearchNode = process.env.ELASTICSEARCH_NODE?.trim();
const elasticsearchApiKey = process.env.ELASTICSEARCH_API_KEY?.trim();

export const isElasticsearchEnabled =
  process.env.ELASTICSEARCH_ENABLED === "true" &&
  Boolean(elasticsearchNode && elasticsearchApiKey);

export const elasticsearchIndex =
  process.env.ELASTICSEARCH_INDEX?.trim() || "hospital_public_search";

export const elasticClient = isElasticsearchEnabled
  ? new Client({
      node: elasticsearchNode,
      auth: {
        apiKey: elasticsearchApiKey!,
      },
    })
  : null;
