import { resolve } from "node:path";

const prototypeRoot = process.cwd();
const repositoryRoot = resolve(prototypeRoot, "../..");

export default {
  root: prototypeRoot,
  resolve: {
    alias: {
      "@onetwopivot/boxing-detection": resolve(repositoryRoot, "packages/boxing-detection/src/index.ts"),
    },
  },
  test: { include: ["tests/**/*.test.ts"] },
};
