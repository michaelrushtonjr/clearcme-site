import { beforeEach, vi } from "vitest";
import http from "node:http";
import https from "node:https";
import net from "node:net";

const offline = () => { throw new Error("Tests must mock the network boundary"); };
vi.spyOn(http, "request").mockImplementation(offline);
vi.spyOn(https, "request").mockImplementation(offline);
vi.spyOn(net, "connect").mockImplementation(offline);
beforeEach(() => { vi.stubGlobal("fetch", vi.fn(offline)); });
