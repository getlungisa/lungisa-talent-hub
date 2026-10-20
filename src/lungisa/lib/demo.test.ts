import { beforeEach, describe, expect, it } from "vitest";
import {
  DEMO_LOCATION,
  demoCandidate,
  demoLocation,
  demoName,
  initDemoMode,
  isDemoMode,
} from "./demo";

function setSearch(search: string) {
  window.history.replaceState({}, "", search.startsWith("?") ? `/${search}` : search);
}

describe("demo mode", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
    document.documentElement.classList.remove("demo-on");
    initDemoMode();
  });

  it("is off by default", () => {
    expect(isDemoMode()).toBe(false);
    expect(document.documentElement).not.toHaveClass("demo-on");
    expect(demoCandidate({ id: "candidate-1", name: "Ayanda", location: "Langa" })).toEqual({
      id: "candidate-1",
      name: "Ayanda",
      location: "Langa",
    });
    expect(demoName("candidate-1", "Ayanda")).toBe("Ayanda");
    expect(demoLocation("Langa")).toBe("Langa");
  });

  it("masks candidate names and locations when enabled with the query", () => {
    setSearch("?demo=1");
    initDemoMode();

    expect(isDemoMode()).toBe(true);
    expect(document.documentElement).toHaveClass("demo-on");
    expect(
      demoCandidate({
        id: "candidate-1",
        name: "Ayanda",
        location: "Langa",
      }),
    ).toEqual({
      id: "candidate-1",
      name: "Candidate A",
      location: DEMO_LOCATION,
    });
    expect(
      demoCandidate({
        candidateId: "candidate-2",
        candidateName: "Sipho",
        candidateLocation: "Khayelitsha",
      }),
    ).toEqual({
      candidateId: "candidate-2",
      candidateName: "Candidate B",
      candidateLocation: DEMO_LOCATION,
    });
    expect(
      demoCandidate({
        candidateId: "hidden",
        candidateName: null,
        location: null,
        isAvailable: false,
      }),
    ).toEqual({
      candidateId: "hidden",
      candidateName: null,
      location: null,
      isAvailable: false,
    });
    expect(demoName("candidate-1", "Ayanda")).toBe("Candidate A");
  });

  it("persists across pages and can be disabled with the query", () => {
    setSearch("?demo=1");
    initDemoMode();
    setSearch("/dashboard");
    initDemoMode();

    expect(isDemoMode()).toBe(true);
    expect(document.documentElement).toHaveClass("demo-on");

    setSearch("?demo=0");
    initDemoMode();

    expect(isDemoMode()).toBe(false);
    expect(document.documentElement).not.toHaveClass("demo-on");
  });
});
