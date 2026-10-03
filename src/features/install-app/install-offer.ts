export type InstallOffer = "none" | "prompt" | "ios";

export type InstallContext = {
  coarse: boolean;
  standalone: boolean;
  ios: boolean;
  canPrompt: boolean;
};

/** I decide which install affordance, if any, a device should be shown. */
export function installOffer({
  coarse,
  standalone,
  ios,
  canPrompt,
}: InstallContext): InstallOffer {
  if (!coarse || standalone) return "none";
  if (canPrompt) return "prompt";
  return ios ? "ios" : "none";
}
