export type CardType = "unit" | "spell" | "artifact" | "location";

export type Card = {
  id: string;
  name: string;
  type: CardType;
  cost: number;
  text: string;
  tags?: string[];
  stats?: {
    attack: number;
    health: number;
  };
};

export type GenerationLogEntry = {
  timestamp: string;
  generator: string;
  seed?: string;
  card: Card;
};
