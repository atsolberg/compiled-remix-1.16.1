import * as esbuild from "esbuild";
import { type Manifest } from "../../manifest";
import type * as Channel from "../../channel";
import type { Context } from "../context";
type Compiler = {
    compile: () => Promise<esbuild.OutputFile[]>;
    cancel: () => Promise<void>;
    dispose: () => Promise<void>;
};
export declare const create: (ctx: Context, channels: {
    manifest: Channel.Type<Manifest>;
}) => Promise<Compiler>;
export {};
