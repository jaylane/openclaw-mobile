/**
 * Bonjour/mDNS gateway discovery (post-MVP / nice-to-have).
 *
 * Browses for _openclaw-gw._tcp services on the local network.
 * This requires expo-mdns or a native module not yet available in managed
 * Expo workflow — stubbed here for future implementation.
 */

export interface DiscoveredGateway {
  name: string;
  host: string;
  port: number;
  url: string;
}

type DiscoveryCallback = (gateways: DiscoveredGateway[]) => void;

let active = false;

export function startDiscovery(onUpdate: DiscoveryCallback): () => void {
  if (active) return () => {};
  active = true;

  // TODO: Implement using a native mDNS module when available in Expo managed workflow
  // For now, return empty results
  onUpdate([]);

  return () => {
    active = false;
  };
}
