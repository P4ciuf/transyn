import { Langs } from "../config/langs.js";

/**
 * Union of all M2M100 language names (values of the {@link Langs} map).
 *
 * @example
 * ```ts
 * const name: Language = "French"; // OK
 * ```
 */
export type Language = (typeof Langs)[keyof typeof Langs];
