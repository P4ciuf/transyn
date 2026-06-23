"""M2M100 translation model wrapper with optional INT8 quantization.

Provides a single-class API that loads the tokenizer and model eagerly
on construction and exposes a synchronous :meth:`TranslationModel.translate`
method.  Supports optional bitsandbytes INT8 quantisation for reduced
memory footprint.
"""

import logging

import torch
from transformers import (
    BitsAndBytesConfig,
    M2M100ForConditionalGeneration,
    M2M100Tokenizer,
)

logger = logging.getLogger(__name__)


class TranslationModel:
    """Wraps M2M100 tokenizer and model with a simple translate interface.

    Loads the tokenizer and model from HuggingFace Hub on construction.
    When quantisation is not requested the model is moved to CUDA if
    available, falling back to CPU.  After loading the model is
    immediately set to evaluation mode (``.eval()``).

    Example:
        >>> model = TranslationModel("facebook/m2m100_418M")
        >>> model.translate("Hello world", "fr", source_lang="en")
        {'translatedText': 'Bonjour le monde', 'sourceLang': 'en', 'targetLang': 'fr'}
    """

    def __init__(self, model_name: str, quantization: str | None = None) -> None:
        """Load tokenizer and model from HuggingFace Hub.

        When ``quantization="int8"`` the model is loaded with
        bitsandbytes 8-bit quantisation and ``device_map="auto"``,
        delegating device placement to the transformers library.

        Args:
            model_name: HuggingFace model identifier (e.g.
                ``"facebook/m2m100_418M"``).
            quantization: Pass ``"int8"`` to enable bitsandbytes INT8
                quantisation at load time; ``None`` to load at full
                precision.
        """
        logger.info("Loading tokenizer for %s ...", model_name)
        self.tokenizer: M2M100Tokenizer = M2M100Tokenizer.from_pretrained(model_name)

        load_kwargs: dict = {}
        if quantization == "int8":
            logger.info("Applying INT8 quantization via bitsandbytes")
            load_kwargs["quantization_config"] = BitsAndBytesConfig(load_in_8bit=True)
            load_kwargs["device_map"] = "auto"

        logger.info("Loading model %s ...", model_name)
        self.model: M2M100ForConditionalGeneration = (
            M2M100ForConditionalGeneration.from_pretrained(model_name, **load_kwargs)
        )

        if not quantization:
            device = "cuda" if torch.cuda.is_available() else "cpu"
            self.model.to(device)

        self.model.eval()
        logger.info("Model ready")

    def translate(
        self, text: str, target_lang: str, source_lang: str | None = None
    ) -> dict:
        """Translate text using the loaded M2M100 model.

        When *source_lang* is omitted the tokenizer's current source
        language is used, defaulting to English if none was set.

        Args:
            text: Source text to translate.
            target_lang: M2M100 language code for the target language
                (e.g. ``"fr"``, ``"de"``, ``"es"``).
            source_lang: Optional M2M100 language code for the source
                language.  When ``None``, the tokenizer's preset or
                ``"en"`` is used.

        Returns:
            A dictionary with keys ``translatedText`` (str),
            ``sourceLang`` (str), and ``targetLang`` (str).
        """
        if source_lang is None:
            # Fall back to the tokenizer's current source language or "en".
            self.tokenizer.src_lang = self.tokenizer.src_lang or "en"
        else:
            self.tokenizer.src_lang = source_lang

        self.tokenizer.tgt_lang = target_lang

        encoded = self.tokenizer(
            text, return_tensors="pt", truncation=True, max_length=512
        )
        # Move tensors to the same device as the model to avoid
        # device-mismatch errors when the model sits on GPU.
        encoded = {
            k: v.to(self.model.device) for k, v in encoded.items()
        }  # pyright: ignore[reportUnknownMemberType] — .to() return type not inferred

        target_token_id = self.tokenizer.get_lang_id(target_lang)

        # Disable gradient computation — we are in inference mode and
        # never call backward().
        with torch.no_grad():
            generated = self.model.generate(
                **encoded,
                forced_bos_token_id=target_token_id,
                max_length=512,
                num_beams=4,
                early_stopping=True,
            )

        translated_text = self.tokenizer.decode(generated[0], skip_special_tokens=True)

        return {
            "translatedText": translated_text,
            "sourceLang": source_lang or "en",
            "targetLang": target_lang,
        }
