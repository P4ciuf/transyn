"""Hy-MT2 translation model wrapper with optional INT8 quantization.

Provides a single-class API that loads the tokenizer and model eagerly
on construction and exposes a synchronous :meth:`TranslationModel.translate`
method.  Supports optional bitsandbytes INT8 quantisation for reduced
memory footprint.

Hy-MT2 is a causal (decoder-only) multilingual translation model by
Tencent.  It uses a chat-template prompt format (not encoder-decoder
forced-BOS tokens), requires ``trust_remote_code=True``, and expects
full English language names in the translation instruction.
"""

import logging
from typing import cast

import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
)

logger = logging.getLogger(__name__)

# Mapping from two-letter Hy-MT2 language codes to the full English
# language names required by the chat-template translation prompt
# (e.g. "fr" -> "French").  Codes not in this map fall back to using
# the code itself as the language name in the prompt sent to the model.
# fmt: off
LANG_MAP: dict[str, str] = {
    "ar": "Arabic",
    "bn": "Bengali",
    "bo": "Tibetan",
    "cs": "Czech",
    "de": "German",
    "en": "English",
    "es": "Spanish",
    "fa": "Persian",
    "fr": "French",
    "gu": "Gujarati",
    "he": "Hebrew",
    "hi": "Hindi",
    "id": "Indonesian",
    "it": "Italian",
    "ja": "Japanese",
    "kk": "Kazakh",
    "km": "Khmer",
    "ko": "Korean",
    "mn": "Mongolian",
    "mr": "Marathi",
    "ms": "Malay",
    "my": "Burmese",
    "nl": "Dutch",
    "pl": "Polish",
    "pt": "Portuguese",
    "ru": "Russian",
    "ta": "Tamil",
    "te": "Telugu",
    "th": "Thai",
    "tl": "Filipino",
    "tr": "Turkish",
    "ug": "Uyghur",
    "uk": "Ukrainian",
    "ur": "Urdu",
    "vi": "Vietnamese",
    "yue": "Cantonese",
    "zh": "Chinese",
    "zh-Hant": "Traditional Chinese",
}


class TranslationModel:
    """Wraps Hy-MT2 tokenizer and model with a simple translate interface.

    Loads the tokenizer and model from HuggingFace Hub on construction.
    When quantisation is not requested the model is moved to CUDA if
    available, falling back to CPU.  After loading the model is
    immediately set to evaluation mode (``.eval()``).
    """

    def __init__(
        self,
        model_name: str,
        quantization: str | None = None,
        hf_token: str | None = None,
    ) -> None:
        """Load tokenizer and model from HuggingFace Hub.

        When ``quantization="int8"`` the model is loaded with
        bitsandbytes 8-bit quantisation and ``device_map="auto"``,
        delegating device placement to the transformers library.

        Args:
            model_name: HuggingFace model identifier (e.g.
                ``"tencent/Hy-MT2-1.8B"``).
            quantization: Pass ``"int8"`` to enable bitsandbytes INT8
                quantisation at load time; ``None`` to load at full
                precision.
            hf_token: HuggingFace API token for private/gated repos.
        """
        load_kwargs: dict = {"trust_remote_code": True}
        if hf_token:
            load_kwargs["token"] = hf_token

        logger.info("Loading tokenizer for %s ...", model_name)
        tokenizer = AutoTokenizer.from_pretrained(model_name, **load_kwargs)
        assert tokenizer is not None
        self.tokenizer = tokenizer

        if quantization == "int8":
            logger.info("Applying INT8 quantization via bitsandbytes")
            load_kwargs["quantization_config"] = BitsAndBytesConfig(load_in_8bit=True)
            load_kwargs["device_map"] = "auto"

        logger.info("Loading model %s ...", model_name)
        model = AutoModelForCausalLM.from_pretrained(model_name, **load_kwargs)
        assert model is not None
        self.model = model

        if not quantization:
            device = "cuda" if torch.cuda.is_available() else "cpu"
            self.model.to(device)

        self.model.eval()
        logger.info("Model ready")

    def translate(self, text: str, target_lang: str) -> dict:
        """Translate text using the loaded Hy-MT2 model.

        Args:
            text: Source text to translate.
            target_lang: Hy-MT2 language code for the target language
                (e.g. ``"fr"``, ``"de"``, ``"es"``).

        Returns:
            A dictionary with keys ``translatedText`` (str) and
            ``targetLang`` (str).
        """
        lang_name = LANG_MAP.get(target_lang)
        if lang_name is None:
            logger.warning(
                "Language code '%s' not in LANG_MAP, using code as name",
                target_lang,
            )
            lang_name = target_lang

        prompt = (
            f"Translate the following text into {lang_name}. "
            "Note that you should only output the translated result "
            "without any additional explanation:\n\n"
            f"{text}"
        )
        messages = [{"role": "user", "content": prompt}]

        encoded = self.tokenizer.apply_chat_template(
            messages,
            add_generation_prompt=True,
            return_tensors="pt",
        )
        model_inputs = {
            k: v.to(self.model.device) for k, v in encoded.items()
        }
        input_len = model_inputs["input_ids"].shape[-1]

        with torch.no_grad():
            generated = self.model.generate(
                **model_inputs,
                max_new_tokens=512,
                temperature=0.7,
                top_p=0.6,
                top_k=20,
                repetition_penalty=1.05,
                do_sample=True,
            )

        output_ids = generated[0][input_len:]
        translated_text = cast(
            str, self.tokenizer.decode(output_ids, skip_special_tokens=True)
        ).strip()

        logger.debug("Translated: [%s] -> [%s]", text, translated_text)

        return {
            "translatedText": translated_text,
            "targetLang": target_lang,
        }
