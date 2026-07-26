import type { Project, PublishedOverlay } from "./editor";
import type { SubscriptionRecord } from "./billing";
export interface Database { projects:Project; overlays:PublishedOverlay; subscriptions:SubscriptionRecord }
