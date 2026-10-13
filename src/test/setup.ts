import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest runs without globals here, so Testing Library cannot register its
// own cleanup; without this, each test renders on top of the previous one.
afterEach(cleanup);
