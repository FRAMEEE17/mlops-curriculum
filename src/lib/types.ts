export type Figure = {
  src: string;
  caption: string;
};

export type Concept = {
  id: string;
  name: string;
  hook: string;
  body: string[];
  whyItMatters: string;
  estimatedHours: number;
  figure?: Figure;
};

export type Module = {
  id: string;
  name: string;
  order: number;
  intro: string;
  concepts: Concept[];
};
