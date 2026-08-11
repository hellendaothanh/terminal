/**
 * Sample Plugin: Mock Elasticsearch Connector
 * Upload this file via the Plugin Manager in Omni Terminal.
 */

module.exports = {
  metadata: {
    id: 'mock-elasticsearch',
    name: 'Elasticsearch (Mock)',
    version: '1.0.0',
    author: 'Omni Terminal Community',
    description: 'A mock plugin simulating an Elasticsearch connection and querying.',
    fields: [
      { name: 'host', label: 'Host URL', type: 'text', default: 'http://localhost:9200', required: true },
      { name: 'username', label: 'Username', type: 'text', default: 'elastic' },
      { name: 'password', label: 'Password', type: 'password' },
      { name: 'useSSL', label: 'Use SSL/TLS', type: 'boolean', default: false }
    ]
  },

  query: async (args) => {
    // args will contain: { connection: { host, username, password, useSSL }, query: "..." }
    const { connection, query } = args;

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      // In a real plugin, you would use node-fetch or the official @elastic/elasticsearch client
      const parsedQuery = JSON.parse(query);

      return {
        _shards: { total: 1, successful: 1, failed: 0 },
        hits: {
          total: { value: 1, relation: "eq" },
          hits: [
            {
              _index: "mock_index",
              _id: "1",
              _score: 1.0,
              _source: {
                message: "Hello from Custom Elasticsearch Plugin!",
                connection_used: connection.host,
                query_received: parsedQuery
              }
            }
          ]
        }
      };
    } catch (e) {
      throw new Error("Invalid JSON query format: " + e.message);
    }
  }
};
