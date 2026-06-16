import "dotenv/config";
import SearchIndexer from "../services/search/search.indexer.js";
import { prisma } from "../config/prisma.js";

const main = async () => {
  const result = await SearchIndexer.reindexAll();
  console.table(result);
};

main()
  .catch((error) => {
    console.error("[ELASTICSEARCH] Reindex failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
