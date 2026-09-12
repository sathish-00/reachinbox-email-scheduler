import { elasticsearchClient } from "../config/elasticsearch";

const INDEX_NAME = "email_jobs";

export const ensureEmailIndex = async (): Promise<void> => {
  const exists = await elasticsearchClient.indices.exists({
    index: INDEX_NAME,
  });

  if (!exists) {
    await elasticsearchClient.indices.create({
      index: INDEX_NAME,
      mappings: {
        properties: {
          id: { type: "keyword" },
          recipient: { type: "text" },
          subject: { type: "text" },
          body: { type: "text" },
          status: { type: "keyword" },
          senderId: { type: "keyword" },
          batchId: { type: "keyword" },
          userId: { type: "keyword" },
          scheduledAt: { type: "date" },
          sentAt: { type: "date" },
          failedAt: { type: "date" },
          error: { type: "text" },
          createdAt: { type: "date" },
          updatedAt: { type: "date" },
        },
      },
    });

    console.log(
      `Elasticsearch index created: ${INDEX_NAME}`
    );
  }
};

/**
 * Index a single email job.
 */
export const indexEmailJob = async (
  emailJob: Record<string, unknown>
): Promise<void> => {
  await elasticsearchClient.index({
    index: INDEX_NAME,
    id: String(emailJob.id),
    document: emailJob,
  });
};

/**
 * Index multiple email jobs in one Elasticsearch bulk request.
 *
 * This is much more efficient for large campaigns such as
 * 1000+ scheduled emails.
 */
export const indexEmailJobsBulk = async (
  emailJobs: Record<string, unknown>[]
): Promise<void> => {
  if (emailJobs.length === 0) {
    return;
  }

  const operations = emailJobs.flatMap((emailJob) => [
    {
      index: {
        _index: INDEX_NAME,
        _id: String(emailJob.id),
      },
    },
    emailJob,
  ]);

  const response = await elasticsearchClient.bulk({
    operations,
    refresh: false,
  });

  if (response.errors) {
    const failedItems = response.items.filter(
      (item) => item.index?.error
    );

    console.error(
      `Elasticsearch bulk indexing completed with ${failedItems.length} failed items`
    );

    throw new Error(
      `Elasticsearch bulk indexing failed for ${failedItems.length} email job(s)`
    );
  }
};

/**
 * Update a single email job in Elasticsearch.
 */
export const updateEmailJobIndex = async (
  id: string,
  updates: Record<string, unknown>
): Promise<void> => {
  await elasticsearchClient.update({
    index: INDEX_NAME,
    id,
    doc: updates,
  });
};

/**
 * Search email jobs belonging to a specific user.
 */
export const searchEmailJobs = async (
  userId: string,
  query: string
): Promise<unknown> => {
  return elasticsearchClient.search({
    index: INDEX_NAME,
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query,
              fields: [
                "recipient",
                "subject",
                "body",
                "status",
              ],
            },
          },
        ],
        filter: [
          {
            term: {
              userId,
            },
          },
        ],
      },
    },
  });
};