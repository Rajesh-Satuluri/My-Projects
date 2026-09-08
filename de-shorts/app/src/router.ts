/* Minimal hash router — no dependency. Routes:
   #/            -> topic grid
   #/t/<topic>   -> topic feed
   #/c/<id>      -> single concept (supports cross-topic jumps)
   (?probe=<id>  -> single card for the render gate; handled before the router) */
import { useEffect, useState } from "react";

export type Route =
  | { name: "topics" }
  | { name: "topic"; topic: string }
  | { name: "concept"; id: string }
  | { name: "review" };

function parse(hash: string): Route {
  const h = hash.replace(/^#/, "");
  if (h === "/review") return { name: "review" };
  const t = h.match(/^\/t\/(.+)$/);
  if (t) return { name: "topic", topic: decodeURIComponent(t[1]) };
  const c = h.match(/^\/c\/(.+)$/);
  if (c) return { name: "concept", id: decodeURIComponent(c[1]) };
  return { name: "topics" };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(location.hash));
  useEffect(() => {
    const on = () => setRoute(parse(location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export const go = {
  topics: () => (location.hash = "#/"),
  topic: (t: string) => (location.hash = `#/t/${encodeURIComponent(t)}`),
  concept: (id: string) => (location.hash = `#/c/${encodeURIComponent(id)}`),
  review: () => (location.hash = "#/review"),
};
