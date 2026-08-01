import type { Card } from "../types";

export type CardGenerator = {
  name: string;
  generate: (seed?: string) => Card;
};
