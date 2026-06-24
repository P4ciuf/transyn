/**
 * Payload pushed onto the translation queue when a client requests a
 * translation.  Mirrors the shape expected by the Python worker.
 *
 * @property id - UUID v4 job identifier shared between API and worker.
 * @property text - Source text to translate.
 * @property targetLang - Hy-MT2 language code for the target language.
 */
export interface TranslationJobData {
  id: string;
  text: string;
  targetLang: string;
}

/**
 * Result written to Redis by the Python worker after a translation
 * completes.  Consumed by {@link QueueService.waitForResult}.
 *
 * @property translatedText - The translated output string.
 * @property targetLang - Language the text was translated into.
 */
export interface TranslationResult {
  translatedText: string;
  targetLang: string;
}

/**
 * Snapshot of the BullMQ translation queue gathered by
 * {@link QueueService.getStats}.
 */
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}
