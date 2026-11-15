import { defineConfig } from "orval";

export default defineConfig({
  projecthub: {
    input: {
      target: "http://localhost:5000/openapi/v1.json",
    },
    output: {
      mode: "split",
      target: "./src/lib/api/generated/endpoints.ts",
      schemas: "./src/lib/api/generated/models",
      client: "react-query",
      httpClient: "fetch",
      clean: true,
    },
  },
});
