// The site's preset wheel library. Import this module, not the JSON.
import raw from "./preset-wheels.json";

export type PresetWheel = {
  id: string;
  title: string;
  description: string;
  entries: string[];
  useCase: string;
};

type PresetDataset = { collection: string; observedAt: string; recordCount: number; records: PresetWheel[] };

const dataset = raw as unknown as PresetDataset;

export const presetWheels: PresetWheel[] = dataset.records;

export function presetById(id: string): PresetWheel | undefined {
  return presetWheels.find((p) => p.id === id);
}

export default presetWheels;
